//src/modules/unit/websockets/unitController.js
const { UnitHistory } = require('../unitModel');
const Overlay = require('../../overlay/overlayModel');
const booleanPointInPolygon = require('@turf/boolean-point-in-polygon').default;

async function onUnitGetHistory(historyParams, socket) {
  let { unitId, startTime, endTime } = historyParams;
  const daySummaries = [];

  console.log(`Buscando registros para el rango completo para: ${unitId}`);
  console.log(startTime, endTime);

  startTime = new Date(startTime);
  endTime = new Date(endTime);

  const query = {
    UniqueID: unitId,
    SendTime: {
      $gte: startTime,
      $lte: endTime
    }
  };

  const startQueryTime = new Date();
  console.log('Inicio de la consulta:', startQueryTime.toISOString());

  const events = await UnitHistory.find(query).sort({ SendTime: 1, CountNumber: 1 }).lean();

  const endQueryTime = new Date();
  console.log('Fin de la consulta:', endQueryTime.toISOString());

  console.log('Tiempo de consulta (ms):', endQueryTime - startQueryTime);
  console.log('Total de registros encontrados:', events.length);

  const startAnalysisTime = new Date();
  console.log('Inicia análisis:', startAnalysisTime.toISOString());

  if (events && events.length > 0) {
    try {
      const eventsByDay = splitEventsByDay(events, startTime, endTime);

      for (let dayTimestamp in eventsByDay) {
        dayTimestamp = Number(dayTimestamp);

        const daySummary = await calculateDaySummary(dayTimestamp, eventsByDay[dayTimestamp]);

        daySummaries.push(daySummary);
      }

      daySummaries.forEach(daySummary => {
        socket.emit('unit.history.day', unitId, daySummary);
      });
    }
    catch (e) {
      console.log('Error al calcular el resumen de días:', e);
    }
  }

  socket.emit('unit.history.end', unitId);

  const endAnalysisTime = new Date();
  console.log('Fin de análisis:', endAnalysisTime.toISOString());
  console.log('Tiempo de análisis (ms):', endAnalysisTime - startAnalysisTime);
}

function splitEventsByDay(events, startTime, endTime) {
  console.log("Dividiendo eventos por dia");
  const startTimeTimestamp = startTime.getTime();
  const endTimeTimestamp = endTime.getTime();
  const dayInMilliseconds = 86400000;
  const eventsByDay = {};

  events.forEach(event => {
    const eventTime = new Date(event.SendTime).getTime();

    if (eventTime >= startTimeTimestamp && eventTime < endTimeTimestamp) {
      // Calcular la fecha de inicio del día correspondiente
      const dayStart = startTimeTimestamp + Math.floor((eventTime - startTimeTimestamp) / dayInMilliseconds) * dayInMilliseconds;
      // Si la llave no existe, inicializar con un array vacío
      if (!eventsByDay[dayStart]) {
        eventsByDay[dayStart] = [];
      }
      // Agregar el evento al array correspondiente
      const eventSendTime = new Date(event.SendTime).getTime() / 1000;
      const recId = `${event.UniqueID},${eventSendTime},${event.CountNumber}`

      event.id = recId;

      eventsByDay[dayStart].push(event);
    }
  });

  console.log("Eventos divididos por dia");

  return eventsByDay;
}

async function calculateDaySummary(dayTimestamp, dayEvents) {
  console.log("Calculando resumen para el día:", dayTimestamp);
  /** Estas variables las capturamos solo una vez para todo el historial completo */
  let lastEngine = null;
  let lastMileage = null;
  let lastSendTime = null;

  /** el numero de eventos o paquetes de dispositivo gps del día */
  const dayEventsCount = dayEvents.length;

  /** primer status del día */
  let lastStatus = null;

  /** primera ignicion del día */
  let firstIgn = null;
  /** ultima ignicion  del día */
  let lastIgn = null;

  /** velocidad maxima y id del paquete en el cual se registró del día */
  let topSpeed = 0;
  let topSpeedId = null;

  /** lista de paradas del día */
  const stops = [];

  /** lista de segmentos en movimiento (trips) del día */
  const trips = [];

  /** kilometraje minimo, maximo y offset del día */
  let minMileage = null;
  let maxMileage = null;
  let mileageOffset = 0;

  /** estadisticas de status de la unidad, apagada (off), ralenti (idle) o movimiento (run) del día */
  const stats = {
    off: 0,
    idle: 0,
    run: 0
  };

  /** route */
  const route = new Set();

  console.log(`Analizando ${dayEvents.length} eventos del día`);

  dayEvents.forEach(event => {
    const sendTime = new Date(event.SendTime);
    const speed = event.Speed;
    const mileage = event.Mileage;
    const address = event.AddressInfo?.Address;
    const recId = event.id;

    const latitude = event.Latitude;
    const longitude = event.Longitude;

    const engine = event.Engine;


    /** calculo de la ruta del día */
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      route.add(`${longitude},${latitude}`);
    }

    /** 
    *	 	CALCULO DE ARRANQUE (Verificando que engine esta presente en el evento)
    *		
    *		se considera un arranque de motor,  cuando este pasa de apagado lastEngine = false, 
    *		a encendido engine = true.
    */
    if (typeof engine === 'boolean') {
      /** capturamos el primer engine del total de eventos */
      if (lastEngine === null) {
        lastEngine = engine;
      }

      /**
       *  si el engine cambió de false a true, significa que hubo un arranque
       */
      if (lastEngine === false && engine === true) {
        /*	capturamos  firstIgn solo cuando no existe */
        if (!firstIgn) firstIgn = sendTime;
        /*	lastIgn siempre se sobreescribe para asegurarnos de tener el ultimo arranque capturado */
        lastIgn = sendTime;
      }

      /** si el evento incluye la velocidad hacemos los calculos, si no, lo ignoramos */
      if (Number.isFinite(speed)) {
        /*		Obtenemos el status del evento (run, idle, off)	*/
        let status = getStatus(event);

        if (!lastStatus) {
          lastStatus = status;

          /*
           *   Si el estatus inicial es off o idle, agregamos la primer parada, de lo contrario significa
           *   que esta avanzando.
           */
          if (status == 'off' || status == 'idle') {
            stops.push({
              startRec: recId,
              endRec: null,
              startTime: sendTime,
              endTime: null,
              startCoordinates: { lat: latitude, lng: longitude },
              endCoordinates: null,
              startAddress: address,
              endAddress: null,
              duration: 0
            });
          }
          else if (status == 'run') {
            trips.push({
              startRec: recId,
              endRec: null,
              startTime: sendTime,
              endTime: null,
              startCoordinates: { lat: latitude, lng: longitude },
              endCoordinates: null,
              startAddress: address,
              endAddress: null,
              duration: 0
            });
          }
        }

        /** capturamos el primer SendTime */
        if (!lastSendTime) {
          lastSendTime = sendTime;
        }

        /** calculamos el tiempo transcurrido. cuando es el primer paquete, el tiempo transcurrido es cero */
        const timeLapse = (sendTime - lastSendTime) / 1000;

        /*		Sumamos el tiempo transcurrido al status correspondiente (run, idle, off)	*/
        stats[lastStatus] += timeLapse;

        /** Si estaba en movimiento y se detuvo, agregamos una parada */
        if (lastStatus === 'run' && (status === 'off' || status === 'idle')) {
          stops.push({
            startRec: recId,
            endRec: null,
            startTime: sendTime,
            endTime: null,
            startCoordinates: { lat: latitude, lng: longitude },
            endCoordinates: null,
            startAddress: address,
            endAddress: null,
            duration: 0
          });

          if (trips.length) {
            const lastTripIndex = trips.length - 1;
            const duration = (sendTime - trips[lastTripIndex].startTime) / 1000;
            const durationText = secondsToDHMS(duration);

            trips[lastTripIndex].duration = duration;
            trips[lastTripIndex].durationText = durationText;
            trips[lastTripIndex].endTime = sendTime;
            trips[lastTripIndex].endRec = recId;
            trips[lastTripIndex].endCoordinates = { lat: latitude, lng: longitude };
            trips[lastTripIndex].endAddress = address;
          }
        }
        /** Si estaba parado y comenzo a moverse, registrar termino de parada y el inicio de otro segmento de en movimiento (trips) */
        else if ((lastStatus === 'off' || lastStatus === 'idle') && status === 'run') {
          trips.push({
            startRec: recId,
            endRec: null,
            startTime: sendTime,
            endTime: null,
            startCoordinates: { lat: latitude, lng: longitude },
            endCoordinates: null,
            startAddress: address,
            endAddress: null,
            duration: 0
          });

          if (stops.length) {
            const lastStopIndex = stops.length - 1;
            const duration = (sendTime - stops[lastStopIndex].startTime) / 1000;
            const durationText = secondsToDHMS(duration);

            stops[lastStopIndex].duration = duration;
            stops[lastStopIndex].durationText = durationText;
            stops[lastStopIndex].endTime = sendTime;
            stops[lastStopIndex].endRec = recId;
            stops[lastStopIndex].endCoordinates = { lat: latitude, lng: longitude };
            stops[lastStopIndex].endAddress = address;
          }
        }

        /*	Actualizamos lastTime ultima fecha y lastStatus el ultimo status	*/
        lastSendTime = sendTime;
        lastStatus = status;

        //Sacamos los datos de la velocidad
        if (topSpeed < speed) {
          topSpeed = speed;
          topSpeedId = recId;
        }
      }

      /** actualizamos el lastEngine */
      lastEngine = engine;
    }

    /** calculo de kilometraje */
    if (Number.isFinite(mileage)) {
      /** capturamos el primer odometro en lastMileage, minMileage y maxMileage */
      if (!lastMileage) {
        lastMileage = mileage;
      }

      if (!minMileage) {
        minMileage = mileage;
      }

      if (!maxMileage) {
        maxMileage = mileage;
      }

      /** 
       *  si hubo una vuelta al odometro y se reinicio, hay que sumar el kilometraje
       *  recorrido antes del reinicio, y el kilometraje recorrido despues del reinicio
       */
      if (lastMileage > mileage && (Math.abs(lastMileage - mileage) > 1000)) {
        mileageOffset = maxMileage - minMileage;
        minMileage = mileage;
        maxMileage = mileage;
      }

      if (mileage < minMileage) {
        minMileage = mileage;
      }

      if (mileage > maxMileage) {
        maxMileage = mileage;
      }

      lastMileage = mileage;
    }
    /** calculo de kilometraje fin */
  });

  /** si terminaron los eventos del dia, y la unidad estaba en una parada, hay que completar la info de la ultima parada */
  if (stops.length > 0 && stops[stops.length - 1].endRec === null) {
    const lastStopIndex = stops.length - 1;
    const duration = (dayEvents[dayEvents.length - 1].SendTime - stops[lastStopIndex].startTime) / 1000;
    const durationText = secondsToDHMS(duration);

    stops[lastStopIndex].duration = duration;
    stops[lastStopIndex].durationText = durationText;
    stops[lastStopIndex].endTime = dayEvents[dayEvents.length - 1].SendTime;
    stops[lastStopIndex].endRec = dayEvents[dayEvents.length - 1].id;
    stops[lastStopIndex].endCoordinates = { lat: dayEvents[dayEvents.length - 1].Latitude, lng: dayEvents[dayEvents.length - 1].Longitude };
    stops[lastStopIndex].endAddress = dayEvents[dayEvents.length - 1].AddressInfo?.Address;
  }

  /** si terminaron los eventos del dia, y la unidad estaba en movimiento, hay que completar la info del ultimo segmento en movimiento */
  if (trips.length > 0 && trips[trips.length - 1].endRec === null) {
    const lastTripIndex = trips.length - 1;
    const duration = (dayEvents[dayEvents.length - 1].SendTime - trips[lastTripIndex].startTime) / 1000;
    const durationText = secondsToDHMS(duration);

    trips[lastTripIndex].duration = duration;
    trips[lastTripIndex].durationText = durationText;
    trips[lastTripIndex].endTime = dayEvents[dayEvents.length - 1].SendTime;
    trips[lastTripIndex].endRec = dayEvents[dayEvents.length - 1].id;
    trips[lastTripIndex].endCoordinates = { lat: dayEvents[dayEvents.length - 1].Latitude, lng: dayEvents[dayEvents.length - 1].Longitude };
    trips[lastTripIndex].endAddress = dayEvents[dayEvents.length - 1].AddressInfo?.Address;
  }

  /** calculamos el kilometraje recorrido en el día */
  const distance = getDistance(minMileage, maxMileage, mileageOffset);

  /** calculamos las estadisticas de status de la unidad en texto */
  const textStats = getTextStats(stats);

  /** Obtener geocercas que intersectan con el bounding box */
  const overlays = await getOverlaysIntersectingRoute(route);


  /** para cada paquete (evento), agregar en que geocercas estuvo */
  const overlaysStats = getOverlayStats(dayEvents, overlays);
  const overlaysInfo = overlays.map(overlay => { return { id: overlay._id.toString(), name: overlay.name } });

  const daySummary = {
    dayTimestamp: dayTimestamp,
    dayEvents,
    dayEventsCount,
    distance,
    hourMeterCount: stats.run + stats.idle,
    hourMeterCountText: secondsToDHMS(stats.run + stats.idle),
    firstIgn,
    lastIgn,
    topSpeed,
    topSpeedId,
    stops,
    trips,
    runTime: stats.run,
    idleTime: stats.idle,
    offTime: stats.off,
    runTimeText: textStats.run,
    idleTimeText: textStats.idle,
    offTimeText: textStats.off,
    overlays: overlaysInfo,
    overlaysStats
  };

  return daySummary;
}

function getStatus(event) {
  const speed = event.Speed;
  const engine = event.Engine;

  if (speed > 3) {
    return 'run';
  }
  else {
    if (engine === false) {
      return 'off';
    }

    if (engine == true) {
      return 'idle';
    }
  }
}

function getDistance(minMileage, maxMileage, mileageOffset) {
  return (minMileage && maxMileage) ? Number((maxMileage - minMileage + mileageOffset).toFixed(2)) : 0;
}

function getTextStats(stats) {
  return {
    off: secondsToDHMS(stats.off),
    idle: secondsToDHMS(stats.idle),
    run: secondsToDHMS(stats.run)
  };
}

async function getOverlaysIntersectingRoute(route) {
  const routeLineString = getRouteLineStringFromRoute(route);
  const query = {
    overlayBufferPolygon: {
      $geoIntersects: {
        $geometry: routeLineString
      }
    }
  };

  const overlays = await Overlay.find(query).lean();

  overlays.forEach(overlay => {
    overlay._id = overlay._id.toString();
  });

  return overlays;
}

function getRouteLineStringFromRoute(route) {
  const routeArray = Array.from(route).map(coord => {
    const [longitude, latitude] = coord.split(',').map(Number);
    return [longitude, latitude];
  });

  /** Si routeArray tiene solo una coordenada, agregar una coordenada cercana */
  if (routeArray.length === 1) {
    const [lon, lat] = routeArray[0];
    const offset = 0.00001;
    routeArray.push([lon + offset, lat + offset]);
  }

  const routeLineString = {
    type: "LineString",
    coordinates: routeArray
  };

  return routeLineString;
}

function getOverlayStats(events, overlays) {
  // Inicializamos un objeto para rastrear la estancia en las geocercas
  const activeOverlays = {};
  const overlayStats = [];

  events.forEach((event, i) => {
    const latitude = event.Latitude;
    const longitude = event.Longitude;
    const sendTime = new Date(event.SendTime);
    const overlaysContainingPoint = [];

    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      const point = {
        type: "Point",
        coordinates: [longitude, latitude]
      };

      overlays.forEach(overlay => {
        const polygon = {
          type: "Polygon",
          coordinates: overlay.overlayBufferPolygon.coordinates
        };
        const overlayInfo = { id: overlay._id.toString(), name: overlay.name };

        const overlayId = overlay._id;

        if (booleanPointInPolygon(point, polygon)) {
          overlaysContainingPoint.push(overlayInfo);

          // Si el punto está dentro de la geocerca
          if (!activeOverlays[overlayId]) {
            // Si no hay una estancia activa, iniciamos una
            activeOverlays[overlayId] = {
              overlay: overlayInfo,
              startRec: event.id,
              startTime: sendTime,
              startCoordinates: { lat: latitude, lng: longitude },
              startAddress: event.AddressInfo?.Address,
              endRec: null,
              endTime: null,
              endCoordinates: null,
              endAddress: null,
              duration: 0,
              durationText: ""
            };
          }
        } else {
          // Si el punto no está dentro de la geocerca pero había una estancia activa
          if (activeOverlays[overlayId]) {
            const overlayData = activeOverlays[overlayId];
            overlayData.endRec = event.id;
            overlayData.endTime = sendTime;
            overlayData.duration = (sendTime - overlayData.startTime) / 1000;
            overlayData.durationText = secondsToDHMS(overlayData.duration);
            overlayData.endCoordinates = { lat: latitude, lng: longitude };
            overlayData.endAddress = event.AddressInfo?.Address;

            // Añadir la estancia completada al array de estancias
            overlayStats.push(overlayData);

            // Remover la estancia activa
            delete activeOverlays[overlayId];
          }
        }
      });
    }

    // Asignar las geocercas contenidas al evento
    event.Overlays = overlaysContainingPoint;
  });

  // Verificar si quedaron geocercas activas al finalizar todos los eventos
  for (const overlayId in activeOverlays) {
    const overlayData = activeOverlays[overlayId];
    overlayData.endRec = events[events.length - 1].id;
    overlayData.endTime = new Date(events[events.length - 1].SendTime);
    overlayData.duration = (overlayData.endTime - overlayData.startTime) / 1000;
    overlayData.durationText = secondsToDHMS(overlayData.duration);
    overlayData.endCoordinates = { lat: events[events.length - 1].Latitude, lng: events[events.length - 1].Longitude };
    overlayData.endAddress = events[events.length - 1].AddressInfo?.Address;

    // Añadir la estancia completada al array de estancias
    overlayStats.push(overlayData);
  }

  // Retornar las estancias de las geocercas junto con los eventos modificados
  return overlayStats;
}

function secondsToDHMS(seconds) {
  // Calcular días, horas, minutos y segundos
  const days = Math.floor(seconds / (24 * 60 * 60));
  seconds %= (24 * 60 * 60);
  const hours = Math.floor(seconds / (60 * 60));
  seconds %= (60 * 60);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  // Formatear el resultado
  let result = '';
  if (days > 0) {
    result += days + (days === 1 ? ' día ' : ' días ');
  }
  if (hours > 0) {
    result += hours + (hours === 1 ? ' hora ' : ' horas ');
  }
  if (minutes > 0) {
    result += minutes + (minutes === 1 ? ' minuto ' : ' minutos ');
  }
  if (secs > 0 || result === '') { // Mostrar segundos incluso si es 0 o el resultado es vacío
    result += secs + (secs === 1 ? ' segundo' : ' segundos');
  }

  return result.trim();
}

module.exports = {
  onUnitGetHistory
};