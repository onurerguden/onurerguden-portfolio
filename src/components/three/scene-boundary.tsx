"use client";
import { Component, type ReactNode } from "react";

/** Contains a failing WebGL scene so the surrounding HTML keeps working. */
export default class SceneBoundary extends Component<
  { children: ReactNode; onFailure: () => void; label?: string },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    console.error(`${this.props.label ?? "3D scene"} failed`, error);
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
