# SRM Campus Portal Frontend

This Vite-powered React app hosts the student, faculty, and admin portals for the SRM smart campus experience. It ships with Tailwind styles, a suite of UI utilities, and views that connect to the Go backend API.

## Quick start

```powershell
cd frontend
npm install
npm run dev
```

The dev server runs on <http://localhost:5173>. The default API base URL is configured in `.env` as `VITE_API_URL`.

## Student Research Feed

The redesigned research feed lets students publish updates, discover collaborators, and monitor trending work:

- Sign in with a student account and choose **Research Feed** from the left navigation.
- Draft a post from the **Start a Research Post** composer. Photo and link actions are pre-wired for UI flow; hook them to your storage or link handler as needed.
- Filter updates with the All Posts / Collaboration / My Research / Trending chips.
- Sort by **Most Recent** or **Most Popular** using the dropdown on the right.
- Each post highlights author info, tags, social actions (likes, comments, collaborations), and quick buttons to share or invite collaborators.

## Faculty Dashboard

The refreshed faculty workspace highlights teaching impact, AI grading suggestions, mentorship, and course management:

- Summary metrics for courses taught, mentees supported, average grade, and pending reviews.
- An **AI Grading Assistant** queue with approve / follow-up workflows powered by the Go backend.
- Mentorship roster controls to add learners, adjust meeting status, and log notes.
- Course catalog management for publishing, drafting, or archiving classes.
- Real-time cohort analytics, course progress bars, and the campus leaderboard to spotlight top performers.

Sign in with the seeded faculty user (`meera@learnonline.edu` / `faculty123`) to explore the experience.

## Building for production

```powershell
npm run build
```

The output bundles to `frontend/dist`. Deploy the static assets with any CDN or static host.
