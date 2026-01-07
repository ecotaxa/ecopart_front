import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { useAuthStore } from "@/features/auth";
import { Box, CircularProgress } from "@mui/material";

export default function App() {
  const isAuthLoading = useAuthStore((s) => s.isAuthLoading);

  if (isAuthLoading) {
    return (
      <Box
        sx={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return <RouterProvider router={router} />;
}
