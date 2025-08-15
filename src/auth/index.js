const passport = require('passport');
const { localStrategy, googleStrategy } = require('./strategies');
const db = require('../db');

function initAuth(app) {
	passport.use(localStrategy());
	passport.use('google', googleStrategy());
	passport.serializeUser((user, done) => done(null, user.id));
	passport.deserializeUser(async (id, done) => {
		try {
			const user = await db.get('SELECT id, email, name, role FROM users WHERE id = ?', [id]);
			if (!user) return done(null, false);
			done(null, user);
		} catch (e) { done(e); }
	});
	app.use(passport.initialize());
	app.use(passport.session());
}

module.exports = { initAuth, passport };
