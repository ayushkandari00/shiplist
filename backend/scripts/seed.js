// scripts/seed.js
// Populates the database with demo data:
//   - 1 admin user
//   - 5 regular users
//   - 15 feature request posts (mixed categories/statuses)
//   - votes
//   - top-level comments + threaded replies

require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const User    = require('../src/models/User');
const Post    = require('../src/models/Post');
const Comment = require('../src/models/Comment');

// ── Seed data ──────────────────────────────────────────────────────────────────

const seedUsers = [
  { name: 'Admin User',  email: 'admin@shiplist.dev',  password: 'Admin1234!',  role: 'ADMIN' },
  { name: 'Alice Chen',  email: 'alice@example.com',   password: 'Alice1234!',  role: 'USER'  },
  { name: 'Bob Patel',   email: 'bob@example.com',     password: 'Bob12345!',   role: 'USER'  },
  { name: 'Carol Diaz',  email: 'carol@example.com',   password: 'Carol1234!',  role: 'USER'  },
  { name: 'Dan Nguyen',  email: 'dan@example.com',     password: 'Dan12345!',   role: 'USER'  },
  { name: 'Eva Smith',   email: 'eva@example.com',     password: 'Eva12345!',   role: 'USER'  },
];

const seedPostsData = [
  {
    title:       'Dark mode support across all pages',
    description: '## Dark Mode\n\nPlease add **dark mode** support. Many users work at night and the current white UI is too bright.\n\n- Toggle in user settings\n- Respect system preference\n- Remember the preference',
    category:    'UI/UX',
    status:      'In Progress',
  },
  {
    title:       'Slack integration for new feature updates',
    description: '## Slack Integration\n\nWhen a feature moves to **In Progress** or **Completed**, send a notification to a configured Slack channel.\n\nThis would keep teams informed without having to check the portal manually.',
    category:    'Integrations',
    status:      'Planned',
  },
  {
    title:       'Export roadmap to PDF',
    description: '## PDF Export\n\nAllow exporting the public roadmap as a PDF for sharing with stakeholders who do not use the portal.',
    category:    'General',
    status:      'Under Review',
  },
  {
    title:       'Faster search results',
    description: '## Search Performance\n\nSearch currently takes 2–3 seconds on large datasets. Can we optimise the query or add an index?\n\nExpected response time: **< 300ms**',
    category:    'Performance',
    status:      'Under Review',
  },
  {
    title:       'Keyboard shortcuts for power users',
    description: '## Keyboard Shortcuts\n\nAdd keyboard shortcuts for common actions:\n\n| Shortcut | Action |\n|---|---|\n| `V` | Vote |\n| `C` | Open comments |\n| `N` | New post |',
    category:    'UI/UX',
    status:      'Under Review',
  },
  {
    title:       'GitHub issue sync',
    description: '## GitHub Sync\n\nWhen a feature is set to **In Progress**, automatically create a linked GitHub issue. When completed, close the issue.',
    category:    'Integrations',
    status:      'Planned',
  },
  {
    title:       'Reduce bundle size by 40%',
    description: '## Bundle Optimisation\n\nThe frontend JS bundle is currently **2.1 MB**. We should:\n\n1. Code-split by route\n2. Tree-shake unused libraries\n3. Replace heavy libraries with lighter alternatives',
    category:    'Performance',
    status:      'Completed',
  },
  {
    title:       'Email digest for weekly roadmap updates',
    description: '## Weekly Email Digest\n\nSend a weekly summary email to subscribed users listing:\n\n- Features moved to each status\n- New top-voted requests',
    category:    'General',
    status:      'Under Review',
  },
  {
    title:       'Mobile-responsive layout',
    description: '## Mobile Support\n\nThe current layout breaks on screens smaller than 768px. We need a fully responsive design for mobile users.',
    category:    'UI/UX',
    status:      'Completed',
  },
  {
    title:       'Zapier integration',
    description: '## Zapier\n\nAllow users to connect the portal to 5000+ apps via Zapier.\n\n**Triggers**: New post, status change, new vote milestone\n**Actions**: Create post, change status',
    category:    'Integrations',
    status:      'Under Review',
  },
  {
    title:       'Comment reactions (emoji)',
    description: '## Emoji Reactions\n\nLet users react to comments with emoji (👍 ❤️ 🎉) instead of having to write a reply just to agree.',
    category:    'UI/UX',
    status:      'Under Review',
  },
  {
    title:       'Database query caching',
    description: '## Query Caching\n\nFrequently requested lists (top voted, by category) should be cached at the application layer to reduce DB load during traffic spikes.',
    category:    'Performance',
    status:      'Under Review',
  },
  {
    title:       'CSV import for bulk feature requests',
    description: '## CSV Import\n\nAllow product managers to bulk-import feature requests from a CSV file during onboarding instead of creating them one by one.',
    category:    'General',
    status:      'Planned',
  },
  {
    title:       'Customisable post categories',
    description: '## Custom Categories\n\nLet admins define their own categories instead of being limited to the defaults. Some products need domain-specific labels.',
    category:    'General',
    status:      'Under Review',
  },
  {
    title:       'API rate limit dashboard',
    description: '## Rate Limit Dashboard\n\nShow admins the current rate limit usage per endpoint so they can tune limits before real users hit them.',
    category:    'Performance',
    status:      'In Progress',
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Pick `n` random items from an array (without replacement) */
const pickRandom = (arr, n) => {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
};

// ── Main seed function ─────────────────────────────────────────────────────────

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Promise.all([User.deleteMany(), Post.deleteMany(), Comment.deleteMany()]);
    console.log('🗑️  Cleared existing data');

    // Create users
    const createdUsers = [];
    for (const userData of seedUsers) {
      const passwordHash = await bcrypt.hash(userData.password, 12);
      const user = await User.create({
        name:         userData.name,
        email:        userData.email,
        passwordHash,
        role:         userData.role,
        isVerified:   true, // all seed users are pre-verified
      });
      createdUsers.push(user);
    }
    console.log(`👥 Created ${createdUsers.length} users`);

    const adminUser   = createdUsers[0];
    const regularUsers = createdUsers.slice(1);

    // Create posts
    const createdPosts = [];
    for (let i = 0; i < seedPostsData.length; i++) {
      const postData = seedPostsData[i];
      // Rotate authors: first few posts by admin, rest by regular users
      const author = i < 3 ? adminUser : regularUsers[i % regularUsers.length];

      // Add 2–5 random voters
      const voters = pickRandom(createdUsers, Math.floor(Math.random() * 4) + 2);

      const post = await Post.create({
        title:       postData.title,
        description: postData.description,
        category:    postData.category,
        status:      postData.status,
        author:      author._id,
        voters:      voters.map((u) => u._id),
        voteCount:   voters.length,
      });
      createdPosts.push(post);
    }
    console.log(`📋 Created ${createdPosts.length} posts`);

    // Create comments and replies
    let commentCount = 0;

    for (const post of createdPosts.slice(0, 8)) { // comment on first 8 posts
      const commentAuthor1 = regularUsers[0];
      const commentAuthor2 = regularUsers[1];
      const commentAuthor3 = regularUsers[2];

      // Top-level comment 1
      const topComment1 = await Comment.create({
        post:         post._id,
        author:       commentAuthor1._id,
        content:      `## Agreed!\n\nThis is something our team has been waiting for. We would use this feature every day.\n\n> The sooner the better!`,
        parentComment: null,
      });
      commentCount++;

      // Reply to comment 1
      await Comment.create({
        post:          post._id,
        author:        commentAuthor2._id,
        content:       `Thanks for bringing this up! I'd add that it would also help with **onboarding** new users.`,
        parentComment: topComment1._id,
      });
      commentCount++;

      // Another reply to comment 1
      await Comment.create({
        post:          post._id,
        author:        adminUser._id,
        content:       `We hear you! This is on our radar. 🚀`,
        parentComment: topComment1._id,
      });
      commentCount++;

      // Top-level comment 2
      const topComment2 = await Comment.create({
        post:          post._id,
        author:        commentAuthor3._id,
        content:       `Could you also consider adding **export options** alongside this? Would make it even more useful.`,
        parentComment: null,
      });
      commentCount++;

      // Reply to comment 2
      await Comment.create({
        post:          post._id,
        author:        commentAuthor1._id,
        content:       `Good point! CSV and PDF export would be amazing.`,
        parentComment: topComment2._id,
      });
      commentCount++;

      // Update post commentCount
      await Post.findByIdAndUpdate(post._id, { commentCount });
      commentCount = 0; // reset for next post
    }

    console.log('💬 Created comments and threaded replies');

    console.log('\n✅ Database seeded successfully!\n');
    console.log('─────────────────────────────────────────────');
    console.log('Demo credentials:');
    console.log('');
    console.log('  ADMIN');
    console.log('  Email   : admin@shiplist.dev');
    console.log('  Password: Admin1234!');
    console.log('');
    console.log('  USER');
    console.log('  Email   : alice@example.com');
    console.log('  Password: Alice1234!');
    console.log('─────────────────────────────────────────────\n');

  } catch (err) {
    console.error('Seed failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
};

seed();
