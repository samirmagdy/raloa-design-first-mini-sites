import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: { public_read: { executor: 'constant-vus', vus: 10, duration: '30s' } },
  thresholds: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<500'] }
};

const base = __ENV.BASE_URL || 'http://127.0.0.1:4010';
export default function () {
  const health = http.get(`${base}/health`);
  check(health, { 'health is 200': (response) => response.status === 200 });
  const profile = http.get(`${base}/public/v1/profiles/demo`);
  check(profile, { 'profile endpoint responds': (response) => response.status === 200 });
  sleep(1);
}
