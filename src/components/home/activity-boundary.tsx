"use client";
import { Component, type ReactNode } from "react";

/** Keeps a failure inside the activity section; the rest of the page stays up. */
export default class ActivityBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    console.error("GitHub activity failed to render", error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
