# 🌊 Okinawa Travel Blog

An interactive travel blog and map application for discovering and sharing beautiful locations in Okinawa, Japan. Built with Next.js, Supabase, and Leaflet for an immersive mapping experience.

## ✨ Features

### 🗺️ **Interactive Map**
- **High-quality satellite imagery** of Okinawa using Esri World Imagery
- **Category-based filtering** to view specific types of locations
- **Click-to-add pins** for authenticated users to mark locations
- **Responsive design** that works on desktop and mobile devices
- **SSR-safe implementation** preventing server-side rendering issues

### 🔐 **User Authentication**
- **Public browsing** - anyone can view pins without logging in
- **User registration** with email, password, and name
- **Secure login/logout** using Supabase authentication
- **User profiles** automatically created in database
- **Authenticated users** can create and manage their own pins

### 📍 **Location Pins**
- **Create pins** by clicking on the map (authenticated users only)
- **Rich metadata** including title, description, category, and 1-5 star ratings
- **Category system** with predefined types: Restaurants, Beaches, Scenic Areas, Activities, etc.
- **Photo galleries** with multiple images per location
- **Author tracking** - users can only edit their own pins
- **Detailed pin modals** showing all information and media

### 🎨 **Modern UI/UX**
- **Turquoise glassmorphism design** with high contrast and beautiful aesthetics
- **Modal-based interactions** for creating and viewing pins
- **Category filtering** on the main map interface
- **Loading states** and error handling throughout
- **Mobile-first approach** for travelers on the go

## 🏗️ **Tech Stack**

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Maps**: Leaflet.js with react-leaflet
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Deployment**: Ready for Vercel deployment

## 📁 **Project Structure**

```
okinawa-travel-blog/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx         # Root layout with metadata
│   │   ├── page.tsx           # Main homepage with auth logic
│   │   └── globals.css        # Global styles + Tailwind imports
│   ├── components/             # Reusable UI components
│   │   ├── Header.tsx         # Navigation + Authentication modals
│   │   ├── OkinawaMap.tsx     # Map wrapper (SSR-safe)
│   │   ├── OkinawaMapComponent.tsx # Actual map with Leaflet
│   │   ├── PinModal.tsx       # View pin details modal
│   │   └── AddPinModal.tsx    # Create new pin modal
│   └── lib/                   # Utility functions
│       └── supabase.ts        # Supabase client + TypeScript types
├── supabase/                  # Database migrations
│   └── migrations/            # SQL migration files
├── public/                    # Static assets
└── package.json               # Dependencies and scripts
```

## 🗄️ **Database Schema**

### **Users Table**
```sql
- id: UUID (Primary Key)
- email: TEXT (Unique)
- name: TEXT
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### **Pins Table**
```sql
- id: UUID (Primary Key)
- title: TEXT
- description: TEXT
- category: TEXT (Restaurants, Beaches, Scenic Areas, Activities, etc.)
- lat: DECIMAL (Latitude)
- lng: DECIMAL (Longitude)
- created_by: UUID (References auth.users.id)
- rating: INTEGER (1-5)
- notes: TEXT (Optional additional details)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### **Photos Table**
```sql
- id: UUID (Primary Key)
- pin_id: UUID (References pins.id)
- url: TEXT
- caption: TEXT (Optional)
- order_index: INTEGER
- created_at: TIMESTAMP
```

## 🚀 **Getting Started**

### **Prerequisites**
- Node.js 18+ 
- npm, yarn, or pnpm
- Supabase account and project

### **1. Clone and Install**
```bash
git clone <your-repo-url>
cd okinawa-travel-blog
npm install
```

### **2. Environment Setup**
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### **3. Database Setup**
```bash
# Link to your Supabase project
supabase login
supabase link --project-ref your_project_ref

# Push database migrations
supabase db push
```

### **4. Run Development Server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your app!

## 🔧 **Development**

### **Available Scripts**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### **Key Components to Customize**
- **Map styling** - Modify `OkinawaMapComponent.tsx`
- **Authentication UI** - Update `Header.tsx`
- **Pin forms** - Customize `AddPinModal.tsx`
- **Database schema** - Edit migration files in `supabase/migrations/`

## ⚙️ **Configuration & Settings**

### **Map Configuration**
```typescript
// Map center coordinates (OkinawaMapComponent.tsx)
center={[26.65, 127.9764]}  // Centered on northern Okinawa (near Nago)
zoom={9}                     // Zoom level for optimal island visibility
```

**Map Center Details:**
- **Latitude:** 26.65°N (northern Okinawa)
- **Longitude:** 127.9764°E (Pacific side)
- **Location:** Near Nago, Okinawa
- **Purpose:** Optimal framing of northern Okinawa islands

### **Global CSS Configuration**
The application uses several CSS overrides to ensure consistent styling:

#### **Font Color Overrides**
```css
/* Force white text globally to override Tailwind conflicts */
* {
  color: white !important;
}

/* Override Tailwind text color utilities */
.text-black, .text-gray-900, .text-gray-800, .text-gray-700,
.text-gray-600, .text-gray-500, .text-gray-400, .text-gray-300,
.text-gray-200, .text-gray-100 {
  color: white !important;
}
```

#### **Authentication Button Styling**
```css
/* Force transparent backgrounds with white outlines */
.auth-buttons-container button {
  background-color: transparent !important;
  border: 2px solid white !important;
  color: white !important;
}

/* Ensure proper button positioning */
.auth-buttons-container {
  bottom: 1rem !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
}
```

#### **Map Control Hiding**
```css
/* Completely hide zoom controls */
.leaflet-control-zoom,
.leaflet-control-zoom-in,
.leaflet-control-zoom-out {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
}
```

### **Header Configuration**
- **Height:** Responsive (40vh on mobile, 50vh on small screens, 60vh on medium+)
- **Background:** Satellite image with blue gradient overlay
- **Text:** White title with teal subtitle
- **Positioning:** Floating overlay with parallax effect

### **Authentication Button Positioning**
- **Location:** Bottom center of screen
- **Spacing:** 16px from bottom edge (`bottom-4`)
- **Layout:** Side-by-side with proper spacing
- **Style:** Transparent containers with white outlines

### **CSS Loading Order**
```css
@tailwind base;      /* Tailwind base styles */
@tailwind components; /* Tailwind component styles */
@tailwind utilities;  /* Tailwind utility classes */
/* Custom overrides with !important declarations */
```

**Why This Order Matters:**
- Custom CSS overrides must come after Tailwind
- `!important` declarations ensure our styles take precedence
- Prevents Tailwind utility classes from overriding our design

## 📱 **Usage**

### **For Travelers**
1. **Browse the map** - Explore Okinawa with satellite imagery
2. **View existing pins** - Click markers to see location details
3. **Sign up** - Create an account to contribute
4. **Add locations** - Mark your favorite spots with ratings

### **For Content Creators**
1. **Authenticate** - Login with your account
2. **Click map** - Select locations to add pins
3. **Fill details** - Add title, description, and rating
4. **Share experiences** - Help others discover Okinawa

## 🚧 **Roadmap**

### **Phase 1: Core Features** ✅
- [x] Interactive map with satellite imagery
- [x] User authentication system
- [x] Basic pin creation and viewing
- [x] Responsive design

### **Phase 2: Core Functionality** 🚧
- [ ] Enable account creation and user registration
- [ ] Photo upload system with Supabase Storage
- [ ] Photo carousel in pin modals
- [ ] Category filtering on map interface
- [ ] Pin editing and deletion for authors

### **Phase 3: Enhanced Features** 📋
- [ ] Enhanced pin modal with full details view
- [ ] Search functionality across pins
- [ ] Advanced filtering (rating, date, author)
- [ ] User profile customization
- [ ] Pin management dashboard

### **Phase 4: Advanced Features** 🔮
- [ ] Video support for pins
- [ ] Social features (likes, comments, sharing)
- [ ] Offline map support
- [ ] Mobile app version

## 🤝 **Contributing**

This project is designed for a small group of friends to share their Okinawa travel experiences. To contribute:

1. **Fork the repository**
2. **Create a feature branch**
3. **Make your changes**
4. **Test thoroughly**
5. **Submit a pull request**

## 📄 **License**

This project is for personal use and sharing among friends. Feel free to adapt it for your own travel blog needs.

## 🌟 **Acknowledgments**

- **Next.js team** for the amazing React framework
- **Supabase** for the powerful backend-as-a-service
- **Leaflet** for the excellent mapping library
- **Tailwind CSS** for the utility-first CSS framework

---

**Happy exploring in Okinawa!** 🏝️✨
