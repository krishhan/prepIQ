from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APITestCase

from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

class AuthTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.signup_url = reverse('auth-signup')
        self.login_url = reverse('auth-login')
        self.csrf_url = reverse('auth-csrf')
        self.me_url = reverse('auth-me')
        self.logout_url = reverse('auth-logout')

        self.user_data = {
            "email": "testuser@example.com",
            "name": "Test User",
            "password": "strongpassword123"
        }

    def test_signup_and_cookie_auth(self):
        """
        Tests that user signup creates the account and sets secure httpOnly cookies.
        """
        response = self.client.post(self.signup_url, self.user_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['email'], self.user_data['email'])
        
        # Verify access and refresh token cookies are set
        self.assertIn('access_token', response.cookies)
        self.assertIn('refresh_token', response.cookies)
        self.assertTrue(response.cookies['access_token']['httponly'])
        self.assertTrue(response.cookies['refresh_token']['httponly'])

    def test_login_and_cookie_auth(self):
        """
        Tests that user login authenticates and sets cookies.
        """
        User.objects.create_user(
            email=self.user_data['email'],
            name=self.user_data['name'],
            password=self.user_data['password']
        )
        response = self.client.post(self.login_url, {
            "email": self.user_data['email'],
            "password": self.user_data['password']
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access_token', response.cookies)
        self.assertIn('refresh_token', response.cookies)

    def test_logout_clears_cookies(self):
        """
        Tests that logging out clears authentication cookies from the client.
        """
        response = self.client.post(self.logout_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # In Django, deleted cookies will have blank values and expires in past
        self.assertEqual(response.cookies['access_token'].value, '')
        self.assertEqual(response.cookies['refresh_token'].value, '')

    def test_csrf_protection_on_mutating_requests(self):
        """
        Tests that mutating requests require valid CSRF headers.
        """
        # Create user
        user = User.objects.create_user(
            email=self.user_data['email'],
            name=self.user_data['name'],
            password=self.user_data['password']
        )
        
        # Authenticate client via cookies
        refresh = RefreshToken.for_user(user)
        self.client.cookies['access_token'] = str(refresh.access_token)

        # Retrieve a CSRF token
        csrf_response = self.client.get(self.csrf_url)
        self.assertEqual(csrf_response.status_code, status.HTTP_200_OK)
        csrf_token = csrf_response.data['csrfToken']

        # Attempt to make a mutating request (POST, PATCH, DELETE) enforcing CSRF
        # Note: APITestCase client by default bypasses CSRF checks unless enforced
        self.client.enforce_csrf_checks = True

        # 1. Mutating request without CSRF header should be rejected (403)
        bad_response = self.client.post(reverse('auth-logout'), {}, format='json')
        self.assertEqual(bad_response.status_code, status.HTTP_403_FORBIDDEN)

        # 2. Mutating request with invalid CSRF header should be rejected (403)
        self.client.credentials(HTTP_X_CSRFTOKEN="invalidtoken")
        bad_response_2 = self.client.post(reverse('auth-logout'), {}, format='json')
        self.assertEqual(bad_response_2.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Mutating request with valid CSRF header should succeed (200)
        self.client.credentials(HTTP_X_CSRFTOKEN=csrf_token)
        good_response = self.client.post(reverse('auth-logout'), {}, format='json')
        self.assertEqual(good_response.status_code, status.HTTP_200_OK)

    def test_brute_force_rate_limit(self):
        """
        Tests that login and signup limits requests to 5 per minute per IP.
        """
        # Execute 5 login attempts (should return 401 for wrong password)
        for _ in range(5):
            response = self.client.post(self.login_url, {
                "email": "nonexistent@example.com",
                "password": "wrongpassword"
            }, format='json')
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # The 6th request should fail with 429 Too Many Requests
        throttled_response = self.client.post(self.login_url, {
            "email": "nonexistent@example.com",
            "password": "wrongpassword"
        }, format='json')
        self.assertEqual(throttled_response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertIn("detail", throttled_response.data)
