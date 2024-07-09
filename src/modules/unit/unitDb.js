//src/database/unit.js
const { Unit } = require('./unitModel');

async function getList(params) {
  // Simplemente realiza una consulta para obtener todas las unidades
  let resp = await Unit.find({});

  if (resp && resp.length > 0) {
    return { totalCount: resp.length, devices: resp };
  } else {
    return { totalCount: 0, devices: [] };
  }
}

module.exports = {
  getList
};

/*async function getList(params) {
  let { start, limit, sort, filter } = params;

  start = parseInt(start);
  limit = parseInt(limit);
  sort = sort ? JSON.parse(sort)[0] : null;

  if (sort) {
    sort = {
      [sort.property]: sort.direction === 'ASC' ? 1 : -1
    }
  }

  if (Number.isNaN(start)) start = 0;
  if (Number.isNaN(limit)) limit = 50;

  // Analiza la cadena JSON de filtros y construye las condiciones, si filter está presente
  let filterConditions = [];
  if (filter) {
    const filters = JSON.parse(filter);
    filterConditions = filters.map(filter => {
      const { operator, value, property } = filter;
      let condition;

      switch (operator) {
        case 'gt':
          condition = { $gt: ['$' + property, value] };
          break;
        case 'lt':
          condition = { $lt: ['$' + property, value] };
          break;
        case 'eq':
          if (property === 'SendTime') {
            condition = { $eq: [{ $dateToString: { format: "%Y-%m-%d", date: '$' + property } }, value] };
          } else {
            condition = { $eq: ['$' + property, value] };
          }
          break;
        case 'like':
          condition = { $regexMatch: { input: '$' + property, regex: new RegExp(value, 'i') } };
          break;
        default:
          throw new Error(`Operator "${operator}" not supported`);
      }

      return condition;
    });
  }

  const pipeline = [];

  // Agrega la etapa de filtrado al pipeline si hay condiciones de filtrado
  if (filterConditions.length > 0) {
    pipeline.push({
      $match: {
        $expr: {
          $and: filterConditions
        }
      }
    });
  }

  // Agrega la etapa $facet para calcular totalCount y aplicar paginación
  const facetStage = {
    $facet: {
      totalCount: [
        { $count: "totalCount" }
      ],
      devices: [
        { $skip: start },
        { $limit: limit }
      ]
    }
  };

  // Agrega la etapa de ordenación al pipeline si se proporciona el objeto sort
  if (sort) {
    facetStage.$facet.devices.push({ '$sort': sort });
  }

  pipeline.push(facetStage);

  console.dir(pipeline);

  let resp = await Unit.aggregate(pipeline);

  if (resp && resp.length > 0) {
    resp = resp[0];

    resp.totalCount = resp.totalCount[0] ? resp.totalCount[0].totalCount : 0;

    return resp;
  }
  else {
    return { totalCount: 0, devices: [] };
  }
}*/