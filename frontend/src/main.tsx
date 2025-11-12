import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import AuthPage from './pages/AuthPage';
import FeedPage from './pages/FeedPage';
import CreateRecipePage from './pages/CreateRecipePage';
import MealPlanPage from './pages/MealPlanPage';
import GroceriesPage from './pages/GroceriesPage';
import RecipeDetailPage from './pages/RecipeDetailPage';
import MyAccountPage from './pages/MyAccountPage';
import UserProfilePage from './pages/UserProfilePage';   // NEW
import './index.css';
import { createRoot } from "react-dom/client";

createRoot(document.getElementById("root")!).render(<App />);

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <FeedPage /> },
      { path: 'auth', element: <AuthPage /> },
      { path: 'create', element: <CreateRecipePage /> },
      { path: 'edit/:id', element: <CreateRecipePage /> },
      { path: 'plan', element: <MealPlanPage /> },
      { path: 'groceries', element: <GroceriesPage /> },
      { path: 'r/:id', element: <RecipeDetailPage /> },
      { path: 'me', element: <MyAccountPage /> },
      { path: 'u/:id', element: <UserProfilePage /> },   // NEW
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
