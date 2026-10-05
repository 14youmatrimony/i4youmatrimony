import unittest
import json
import os
import sys

# Ensure admin path is in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app import app
import database

class AdminPortalTestCase(unittest.TestCase):
    def setUp(self):
        app.config['TESTING'] = True
        self.client = app.test_client()

    def test_01_login_failure(self):
        """Test login with invalid credentials."""
        res = self.client.post('/api/auth/login', json={
            'email': 'wrong@example.com',
            'password': 'badpassword'
        })
        self.assertEqual(res.status_code, 401)
        data = res.get_json()
        self.assertIn('error', data)

    def test_02_login_success(self):
        """Test login with default admin credentials."""
        res = self.client.post('/api/auth/login', json={
            'email': 'admin@i4you.com',
            'password': 'Admin@12345'
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get('success'))
        self.assertEqual(data['user']['email'], 'admin@i4you.com')

    def test_03_protected_endpoints(self):
        """Test that unauthenticated calls to /api/users return 401."""
        fresh_client = app.test_client()
        res = fresh_client.get('/api/users')
        self.assertEqual(res.status_code, 401)

    def test_04_user_crud(self):
        """Test full CRUD lifecycle for User Profiles."""
        # 1. Login
        self.client.post('/api/auth/login', json={
            'email': 'admin@i4you.com',
            'password': 'Admin@12345'
        })

        # 2. Get Users
        res = self.client.get('/api/users?limit=5')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertGreater(data['total'], 0)
        self.assertIsInstance(data['users'], list)

        # 3. Create User
        create_res = self.client.post('/api/users', json={
            'name': 'Test User Candidate',
            'email': 'test.candidate@test.com',
            'phone': '+91 99999 88888',
            'age': 28,
            'gender': 'Female',
            'state': 'Maharashtra',
            'city': 'Pune',
            'profession': 'Lead Scientist',
            'annual_income': '₹ 30 LPA',
            'religion': 'Hindu',
            'status': 'active',
            'verified': 1,
            'aadhaar_verified': 1
        })
        self.assertEqual(create_res.status_code, 201)
        new_user = create_res.get_json()['user']
        user_id = new_user['id']

        # 4. Update User
        update_res = self.client.put(f'/api/users/{user_id}', json={
            'name': 'Test User Candidate Updated',
            'age': 29,
            'status': 'active'
        })
        self.assertEqual(update_res.status_code, 200)
        self.assertEqual(update_res.get_json()['user']['name'], 'Test User Candidate Updated')

        # 5. Toggle Status
        status_res = self.client.patch(f'/api/users/{user_id}/status', json={'status': 'suspended'})
        self.assertEqual(status_res.status_code, 200)
        self.assertEqual(status_res.get_json()['status'], 'suspended')

        # 6. Delete User
        del_res = self.client.delete(f'/api/users/{user_id}')
        self.assertEqual(del_res.status_code, 200)
        self.assertTrue(del_res.get_json().get('success'))

    def test_05_offers_crud(self):
        """Test full CRUD lifecycle for Promotional Offers."""
        # 1. Login
        self.client.post('/api/auth/login', json={
            'email': 'admin@i4you.com',
            'password': 'Admin@12345'
        })

        # 2. Get Offers
        res = self.client.get('/api/offers')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertGreater(data['total'], 0)

        # 3. Create Offer
        create_res = self.client.post('/api/offers', json={
            'code': 'TESTPROMO75',
            'title': 'Test Mega Discount',
            'discount_percent': 75,
            'plan_type': 'All Plans',
            'max_uses': 50,
            'is_active': 1
        })
        self.assertEqual(create_res.status_code, 201)
        offer_id = create_res.get_json()['offer']['id']

        # 4. Update Offer
        update_res = self.client.put(f'/api/offers/{offer_id}', json={
            'code': 'TESTPROMO75',
            'title': 'Test Mega Discount (Updated)',
            'discount_percent': 70
        })
        self.assertEqual(update_res.status_code, 200)
        self.assertEqual(update_res.get_json()['offer']['discount_percent'], 70)

        # 5. Toggle Offer
        toggle_res = self.client.patch(f'/api/offers/{offer_id}/toggle')
        self.assertEqual(toggle_res.status_code, 200)
        self.assertEqual(toggle_res.get_json()['is_active'], 0)

        # 6. Delete Offer
        del_res = self.client.delete(f'/api/offers/{offer_id}')
        self.assertEqual(del_res.status_code, 200)

    def test_06_payments_crud(self):
        """Test full CRUD lifecycle for Payment Transactions & History."""
        # 1. Login
        self.client.post('/api/auth/login', json={
            'email': 'admin@i4you.com',
            'password': 'Admin@12345'
        })

        # 2. Get Payments
        res = self.client.get('/api/payments?limit=5')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertGreater(data['total'], 0)
        self.assertGreater(data['total_volume'], 0)

        # 3. Create Payment
        create_res = self.client.post('/api/payments', json={
            'transaction_id': 'TXN-TEST-998877',
            'user_name': 'Test Paying Candidate',
            'plan_name': 'Gold 3-Months',
            'amount': 2999.0,
            'payment_method': 'UPI (PhonePe)',
            'status': 'completed',
            'notes': 'Test transaction'
        })
        self.assertEqual(create_res.status_code, 201)
        payment_id = create_res.get_json()['payment']['id']

        # 4. Update Payment (e.g. adjust status to refunded)
        update_res = self.client.put(f'/api/payments/{payment_id}', json={
            'user_name': 'Test Paying Candidate',
            'plan_name': 'Gold 3-Months',
            'amount': 2999.0,
            'payment_method': 'UPI (PhonePe)',
            'status': 'refunded',
            'notes': 'Refunded on user request'
        })
        self.assertEqual(update_res.status_code, 200)
        self.assertEqual(update_res.get_json()['payment']['status'], 'refunded')

        # 5. Delete Payment
        del_res = self.client.delete(f'/api/payments/{payment_id}')
        self.assertEqual(del_res.status_code, 200)

    def test_07_analytics_kpi(self):
        """Test analytics aggregation."""
        self.client.post('/api/auth/login', json={
            'email': 'admin@i4you.com',
            'password': 'Admin@12345'
        })
        res = self.client.get('/api/analytics')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn('kpi', data)
        self.assertGreater(data['kpi']['total_users'], 0)
        self.assertGreater(data['kpi']['total_revenue'], 0)
        self.assertIn('verification_breakdown', data)
        self.assertIn('regional_distribution', data)

    def test_08_csv_exports(self):
        """Test CSV export routes."""
        self.client.post('/api/auth/login', json={
            'email': 'admin@i4you.com',
            'password': 'Admin@12345'
        })
        res_users = self.client.get('/export/users/csv')
        self.assertEqual(res_users.status_code, 200)
        self.assertIn('text/csv', res_users.content_type)
        self.assertIn('Name', res_users.get_data(as_text=True))

        res_payments = self.client.get('/export/payments/csv')
        self.assertEqual(res_payments.status_code, 200)
        self.assertIn('text/csv', res_payments.content_type)
        self.assertIn('Transaction ID', res_payments.get_data(as_text=True))

if __name__ == '__main__':
    unittest.main()
