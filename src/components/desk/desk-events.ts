import {
  events as pointerEvents,
  type EventManager,
  type RootStore,
} from "@react-three/fiber";

/**
 * R3F's pointer events for the desk, without the wheel. By default every
 * wheel event raycasts the scene too, though nothing on the desk listens
 * for the wheel: on a trackpad that is dozens of raycasts a second, all
 * while the page scrolls.
 *
 * `skipHover` says when a pointer move should not look for objects (the
 * camera is travelling, so whatever is under the pointer is passing by).
 * The move then ends any hover, as leaving the canvas would; clicks are
 * still hit-tested.
 */
export function deskEvents(
  store: RootStore,
  skipHover: () => boolean = () => false,
): EventManager<HTMLElement> {
  const manager = pointerEvents(store);
  const handlers: Partial<Handlers> = { ...manager.handlers };
  delete handlers.onWheel;
  const { onPointerMove: move, onPointerLeave: leave } = manager.handlers!;
  let hovering = true;
  return {
    ...manager,
    // R3F listens for exactly the handlers named here (see its connect),
    // so a missing onWheel attaches no wheel listener; its type lists all.
    handlers: {
      ...handlers,
      onPointerLeave: leave,
      onPointerMove(event: Event) {
        if (skipHover()) {
          if (hovering) leave(event);
          hovering = false;
          return;
        }
        hovering = true;
        move(event);
      },
    } as Handlers,
  };
}

type Handlers = NonNullable<EventManager<HTMLElement>["handlers"]>;
