//src/controllers/unit.js
const { successHandler } = require('../../../utils/response');
const { getList } = require('../unitDb');

async function getUnitList(req, res, next) {
  const params = req.query;
  console.dir(params);

  try {
    const list = await getList(params);

    successHandler(res, 200, 'Lista de unidades', list);
  } catch (error) {
    console.error(error);
    next(error);
  }
}

module.exports = {
  getUnitList
};