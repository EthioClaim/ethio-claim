const http = require('http');

function req(p, opt = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL('http://localhost:3001/api/v1' + p);
    const r = http.request(
      u,
      {
        method: opt.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(opt.token ? { Authorization: 'Bearer ' + opt.token } : {}),
        },
      },
      (rs) => {
        let b = '';
        rs.on('data', (c) => (b += c));
        rs.on('end', () => resolve({ status: rs.statusCode, body: b }));
      }
    );
    if (opt.body) r.write(JSON.stringify(opt.body));
    r.end();
  });
}

async function run() {
  const lAdmin = await req('/auth/login', {
    method: 'POST',
    body: { email: 'admin@ethioclaim.test', password: 'Password123!' },
  });
  const adminToken = JSON.parse(lAdmin.body).accessToken;
  const adminUsers = await req('/admin/users', { token: adminToken });
  console.log('adminUsers status (with accessToken):', adminUsers.status, adminUsers.body.slice(0, 100));

  const lIntake = await req('/auth/login', {
    method: 'POST',
    body: { email: 'intake@ethioclaim.test', password: 'Password123!' },
  });
  const intakeToken = JSON.parse(lIntake.body).accessToken;
  const intakeAdminUsers = await req('/admin/users', { token: intakeToken });
  console.log('intakeAdminUsers status (with accessToken):', intakeAdminUsers.status, intakeAdminUsers.body);
}

run();
