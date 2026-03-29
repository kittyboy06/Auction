const { Pool } = require('pg');

async function seed() {
  const pool = new Pool({
    connectionString: 'postgresql://user:password@localhost:5432/auction_db'
  });

  try {
    const futureTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    
    // Update existing auction end_time
    const result = await pool.query(
      `UPDATE "Auction" SET end_time = '${futureTime}', status = 'ACTIVE', 
       description = 'One of only 1,858 Roadsters built, this matching-numbers example is finished in its original silver-blue metallic over premium Oxblood leather. Recently emerged from a multi-year restoration by specialist Paul Russell & Company.',
       image_url = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDq0Xufy3zrSkT7DooJFbqPdVRUu2RiFpk0OCyAMMHUJ2fXRfMIOcAe_i9y7MgDHjtcdcs4HVYS_4x7_EMalomPqKnTvZZi0iCzZLNPVdOWwEKgzqeGAgcSLk-DGID5PFwbOBJyIkNDZrz7GfgR7U5zbf3peUG76iaWwIvKH_Twnb9PuQOt6e2e7NbSziX_EEyYRAqR3xBlGItQNJfa6IEu4q7C6ziF9I6xxrDhb-uR7PfEHUiLiKP-XSD5FcEpfnD-M1SdR3Pg9gM',
       current_highest_bid = 1245000
       WHERE title = '1961 Mercedes-Benz 300SL Roadster'`
    );
    
    console.log('Updated rows:', result.rowCount);
    console.log('Auction end_time set to:', futureTime);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

seed();
