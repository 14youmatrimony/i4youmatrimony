import unittest
import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from database import (
    PostgresCursorWrapper,
    is_postgres_configured,
    get_active_db_engine,
    get_database_status,
    get_db_connection,
    init_db
)

class TestPostgresAdapter(unittest.TestCase):
    def test_query_placeholder_conversion(self):
        conv = PostgresCursorWrapper._convert_query

        # Basic parameterized query
        q1 = "SELECT * FROM profiles WHERE id = ?"
        self.assertEqual(conv(q1), "SELECT * FROM profiles WHERE id = %s")

        # Multi-parameter query
        q2 = "SELECT * FROM profiles WHERE id = ? AND status = ? AND age >= ?"
        self.assertEqual(conv(q2), "SELECT * FROM profiles WHERE id = %s AND status = %s AND age >= %s")

        # Query with question mark inside string literal
        q3 = "SELECT 'Is this verified?' as title, id FROM profiles WHERE id = ?"
        self.assertEqual(conv(q3), "SELECT 'Is this verified?' as title, id FROM profiles WHERE id = %s")

        # Insert statement
        q4 = "INSERT INTO offers (code, title, discount) VALUES (?, ?, ?)"
        self.assertEqual(conv(q4), "INSERT INTO offers (code, title, discount) VALUES (%s, %s, %s)")

        # Query without question marks should remain unchanged
        q5 = "SELECT COUNT(*) FROM profiles WHERE status = 'active'"
        self.assertEqual(conv(q5), q5)

    def test_database_status_sqlite_fallback(self):
        # When no PostgreSQL env is set
        status = get_database_status()
        self.assertIn(status['engine'], ['SQLite', 'PostgreSQL'])
        self.assertTrue(status['configured'])

    def test_db_connection_and_initialization(self):
        init_db()
        conn = get_db_connection()
        self.assertIsNotNone(conn)
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM admin_users")
        row = cur.fetchone()
        self.assertGreaterEqual(row[0], 0)
        conn.close()

if __name__ == '__main__':
    unittest.main()
