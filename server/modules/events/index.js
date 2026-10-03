// Events module - events, bookings, calendar
// Event routes are mounted via @lozzalingo/experiences in app.js (at /ev/api).
// The eventProducts controller lives here for co-location.

function registerRoutes(/* app, options */) {
  // Event experience routes are mounted directly in app.js via createExperienceRoutes()
  // because they require the Prisma proxy and @lozzalingo/experiences package.
}

module.exports.registerRoutes = registerRoutes;
module.exports.services = ['bookings', 'calendar', 'email', 'auth'];
