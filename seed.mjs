import { createClient } from '@sanity/client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const client = createClient({
  projectId: 'hm0dr0ya',
  dataset: 'production',
  apiVersion: '2026-09-01',
  useCdn: false,
  // Since we don't have a token, we might not be able to write via the client if it's not public.
  // Wait, the MCP can write if we have a token.
  // Let me just test if I can write without a token... usually not possible for security.
})

async function seed() {
  console.log("Seeding Sanity...");
  try {
    // We might get an unauthorized error here if we don't provide a token.
    const res = await client.create({
      _type: 'siteSettings',
      announcementActive: true,
      announcementText: 'Welcome to the new Health Gazette! Check out our latest issue.',
      announcementLink: '/gazette',
      announcementLinkLabel: 'Read Issue 03',
    });
    console.log("Created siteSettings: ", res._id);
  } catch (err) {
    console.error("Error creating content:", err.message);
  }
}

seed();
