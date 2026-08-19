const https = require('https');

const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2aGd1dWR0enR1dGJ4d29sc3hkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTU3Nzk3NCwiZXhwIjoyMDc1MTUzOTc0fQ.2sDnbsk9Te1bsZ5rN3tOyx83Zl5RsJgVz2N5O_EHXsc";

function supabaseGet(endpoint) {
  return new Promise((resolve, reject) => {
    const url = 'https://gvhguudtztutbxwolsxd.supabase.co/rest/v1/' + endpoint;
    const options = {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': 'Bearer ' + serviceRoleKey,
      }
    };

    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('--- Checking Organizations ---');
  const orgs = await supabaseGet('organizations?select=*');
  console.log('Status:', orgs.status);
  console.log('Orgs:', JSON.stringify(orgs.body, null, 2));

  console.log('\n--- Checking Admin Profiles ---');
  const admins = await supabaseGet('admin_profiles?select=*');
  console.log('Status:', admins.status);
  console.log('Admins:', JSON.stringify(admins.body, null, 2));

  console.log('\n--- Checking Students ---');
  const students = await supabaseGet('students?select=id,name,status,organization_id&limit=5');
  console.log('Status:', students.status);
  console.log('Students:', JSON.stringify(students.body, null, 2));
}

run();
