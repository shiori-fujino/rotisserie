import React from "react";
import { Box, Typography, Button } from "@mui/material";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            textAlign: "center",
            py: 8,
            px: 2,
          }}
        >
          <Typography variant="h4" gutterBottom>
            🍗 Oops! Something went wrong
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            The rotisserie caught fire. Don't worry, we've logged the issue.
          </Typography>
          <Button
            variant="contained"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </Button>
          {process.env.NODE_ENV === "development" && (
            <Box sx={{ mt: 3, textAlign: "left" }}>
              <Typography variant="caption" component="pre">
                {this.state.error?.toString()}
              </Typography>
            </Box>
          )}
        </Box>
      );
    }

    return this.props.children;
  }
}