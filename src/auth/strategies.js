const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const db = require('../db');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

function localStrategy() {
	return new LocalStrategy({ usernameField: 'email', passwordField: 'password' }, async (email, password, done) => {
		try {
			const user = await db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
			if (!user || !user.password_hash) {
				return done(null, false, { message: 'Invalid credentials' });
			}
			const ok = await bcrypt.compare(password, user.password_hash);
			if (!ok) return done(null, false, { message: 'Invalid credentials' });
			if (!user.is_active) return done(null, false, { message: 'Account inactive' });
			return done(null, { id: user.id, email: user.email, name: user.name, role: user.role });
		} catch (e) {
			return done(e);
		}
	});
}

module.exports = { localStrategy };

function googleStrategy() {
	const clientID = process.env.GOOGLE_CLIENT_ID;
	const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
	const callbackURL = process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback';
	if (!clientID || !clientSecret) {
		// Return a dummy strategy that errors if used, allowing app to start without env vars
		return new GoogleStrategy({ clientID: 'x', clientSecret: 'y', callbackURL }, () => {
			throw new Error('Google OAuth env vars not configured');
		});
	}
	return new GoogleStrategy({ clientID, clientSecret, callbackURL }, async (accessToken, refreshToken, profile, done) => {
		try {
			const email = (profile.emails && profile.emails[0] && profile.emails[0].value || '').toLowerCase();
			const googleId = profile.id;
			let user = null;
			if (email) {
				user = await db.get('SELECT id, email, name, role, google_id FROM users WHERE email = ?', [email]);
				if (user && !user.google_id) {
					// Link existing email to google account
					await db.run('UPDATE users SET google_id = ? WHERE id = ?', [googleId, user.id]);
					user.google_id = googleId;
				}
			}
			if (!user) {
				// Try by google_id
				user = await db.get('SELECT id, email, name, role, google_id FROM users WHERE google_id = ?', [googleId]);
			}
			if (!user) {
				// Create new user (google-only)
				const name = profile.displayName || (email ? email.split('@')[0] : 'GoogleUser');
				await db.run('INSERT INTO users (email, google_id, name) VALUES (?,?,?)', [email || `g_${googleId}@example.invalid`, googleId, name]);
				user = await db.get('SELECT id, email, name, role, google_id FROM users WHERE google_id = ?', [googleId]);
			}
			return done(null, { id: user.id, email: user.email, name: user.name, role: user.role });
		} catch (e) {
			return done(e);
		}
	});
}

module.exports.googleStrategy = googleStrategy;
