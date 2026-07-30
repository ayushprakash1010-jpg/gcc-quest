async function main() {
  const res = await fetch('http://localhost:4000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@gccquest.com', password: 'admin123' }),
  });
  const text = await res.text();
  console.log('STATUS:', res.status);
  console.log('BODY:', text);
}
main().catch(console.error);
