/**
 * Times the GPU work drawn between begin() and end(), where the browser
 * offers EXT_disjoint_timer_query_webgl2 (Chromium; Safari does not). The
 * results arrive a frame or more later and poll() returns those that have,
 * without waiting on the GPU. A frame whose timing the GPU disturbed (a
 * "disjoint" frame, such as a power-state change) is dropped.
 */
export type GpuTimer = {
  begin(): void;
  end(): void;
  /** Finished timings, in ms, oldest first. */
  poll(): number[];
  dispose(): void;
};

export function createGpuTimer(gl: WebGL2RenderingContext): GpuTimer | null {
  const ext = gl.getExtension("EXT_disjoint_timer_query_webgl2") as {
    TIME_ELAPSED_EXT: number;
    GPU_DISJOINT_EXT: number;
  } | null;
  if (!ext) return null;
  const pending: WebGLQuery[] = [];
  let active: WebGLQuery | null = null;
  return {
    begin() {
      // A few frames in flight are enough samples; never queue more.
      if (active || pending.length >= 4) return;
      active = gl.createQuery();
      if (active) gl.beginQuery(ext.TIME_ELAPSED_EXT, active);
    },
    end() {
      if (!active) return;
      gl.endQuery(ext.TIME_ELAPSED_EXT);
      pending.push(active);
      active = null;
    },
    poll() {
      const done: number[] = [];
      while (
        pending.length &&
        gl.getQueryParameter(pending[0], gl.QUERY_RESULT_AVAILABLE)
      ) {
        const query = pending.shift()!;
        if (!gl.getParameter(ext.GPU_DISJOINT_EXT))
          done.push(gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6);
        gl.deleteQuery(query);
      }
      return done;
    },
    dispose() {
      if (active) gl.endQuery(ext.TIME_ELAPSED_EXT);
      for (const query of [...pending, active])
        if (query) gl.deleteQuery(query);
      pending.length = 0;
      active = null;
    },
  };
}
