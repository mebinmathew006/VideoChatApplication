from django.test import TestCase
from django.urls import reverse
import json
# Create your tests here.


class SampleViewTest(TestCase):
    def test_sum_two_numbers(self):
        response = self.client.get(reverse('sample', args=[10, 20]))
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.content)
        self.assertEqual(data, 30)
