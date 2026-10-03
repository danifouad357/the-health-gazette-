import { createClient } from '@sanity/client';
const client = createClient({projectId: 'hm0dr0ya', dataset: 'production', apiVersion: '2026-09-01', useCdn: false});
client.fetch('*[_type == "issue"]').then(res => console.log(JSON.stringify(res, null, 2)));
