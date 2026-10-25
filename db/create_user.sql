CREATE ROLE svlollaruser WITH
	LOGIN
	NOSUPERUSER
	NOCREATEDB
	NOCREATEROLE
	INHERIT
	NOREPLICATION
	NOBYPASSRLS
	CONNECTION LIMIT -1
	PASSWORD '<DB_PASSWORT>'; -- durch dasselbe Passwort wie DB_PASSWORD in backend/.env ersetzen

GRANT pg_read_all_data, pg_write_all_data TO svlollaruser;
COMMENT ON ROLE svlollaruser IS 'Database access';