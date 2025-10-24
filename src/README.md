# Property Inspection Clerk System

A mobile-first web application for property inspection clerks that handles property registration, multiple inspection types, photo uploads, and generates shareable web previews.

## Features

- 🏠 **Property Management**: Register and manage properties with detailed information
- 📋 **Four Inspection Types**: Routine, Fire Safety, Check-In, and Check-Out inspections
- 📸 **Photo Upload**: Large photo uploads with mobile camera integration
- 🔗 **Shareable Previews**: Generate web preview links for printing and sharing
- 🔐 **Passwordless Auth**: Magic link email authentication via Supabase
- 👥 **Team Collaboration**: All clerks can see and access all inspections
- 📱 **Mobile-First Design**: Optimized touch interactions for tablets and phones
- 🎨 **Sea-Green Theme**: Clean, modern UI with #2EC4B6 primary color
- 🔒 **Admin Panel**: Role-based authentication with admin user management
- 📊 **Audit Trails**: Track all actions for accountability

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **State Management**: TanStack Query (React Query)
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **Notifications**: Sonner

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone https://github.com/CodeStar86/AB-Property-Inspection-Clerks.git
cd AB-Property-Inspection-Clerks
```

2. Install dependencies:
```bash
npm install
```

3. Set up Supabase:
   - Create a new Supabase project at [supabase.com](https://supabase.com)
   - Copy your project URL and anon key
   - Update `/utils/supabase/info.tsx` with your credentials

4. Deploy Edge Functions:
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Deploy functions
supabase functions deploy make-server-be68fc60 --project-ref YOUR_PROJECT_REF
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:5173](http://localhost:5173) in your browser

## Deployment

Build the application for production:

```bash
npm run build
```

The built files will be in the `dist/` directory. Deploy this folder to any static hosting service (Vercel, Netlify, AWS S3, etc.).

## Project Structure

```
├── components/          # Reusable UI components
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries and types
├── pages/              # Page components
├── styles/             # Global CSS styles
├── supabase/           # Supabase Edge Functions
└── utils/              # Helper utilities
```

## Key Features Explained

### Inspection Types

1. **Routine Inspection**: Regular property checks
2. **Fire Safety**: Fire equipment and safety compliance
3. **Check-In**: Property condition at tenant move-in
4. **Check-Out**: Property condition at tenant move-out

### Mobile Optimizations

- Large touch targets (48x48px minimum)
- Optimistic UI updates for smooth typing
- Mobile-specific textarea handling
- Camera integration for photos
- Responsive layouts for all screen sizes

### Admin Features

- Delete clerk accounts
- Remove clerk data
- View system audit logs
- Export all data (GDPR compliance)

## Environment Variables

Create a `/utils/supabase/info.tsx` file:

```typescript
export const projectId = 'your-project-id';
export const publicAnonKey = 'your-anon-key';
export const supabaseUrl = `https://${projectId}.supabase.co`;
```

## Security

- Row Level Security (RLS) enabled on all tables
- Team collaboration mode (all clerks see everything)
- Admin role for user management
- Secure passwordless authentication
- HTTPS-only in production

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please refer to the documentation or contact the development team.

## Acknowledgments

- Built with [Vite](https://vitejs.dev/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)
- Backend powered by [Supabase](https://supabase.com/)

---

Made with ❤️ for property inspection clerks
