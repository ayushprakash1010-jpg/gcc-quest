const bcrypt = require('bcrypt');
async function main() {
  const match = await bcrypt.compare(
    'password123',
    '$2b$10$4UqYPuYeL77QiFXzRXiCyeStAJEuhmsUjE28E7YtFvudgeLkEVt6C',
  );
  console.log("Match for 'password123':", match);
}
main().catch(console.error);
