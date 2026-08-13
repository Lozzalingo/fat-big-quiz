/**
 * Parse pagination query params with bounds.
 * @param {object} query - req.query
 * @param {number} defaultLimit - default page size (e.g. 20)
 * @param {number} maxLimit - maximum allowed (e.g. 100)
 * @returns {{ page: number, limit: number, skip: number }}
 */
function parsePagination(query, defaultLimit = 20, maxLimit = 100) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit) || defaultLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

module.exports = { parsePagination };
