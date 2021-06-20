export type ComponentChild =
  | VNode<any>
  | object
  | string
  | number
  | boolean
  | null
  | undefined;

export type ComponentChildren = ComponentChild[] | ComponentChild;

export type FragmentType = (props: VNode['props']) => ComponentChildren;

export interface VNode<P = {}> {
  key: Key;
  // Redefine type here using our internal ComponentType type
  // type: string | ComponentType<P>;
  type: string | ComponentType<P> | FragmentType;
  props: (P & { children?: ComponentChildren }) | string | number;
  _children: Array<VNode<any>> | null;
  _parent: VNode | null;
  _depth: number | null;
  /**
   * The [first (for Fragments)] DOM child of a VNode
   */
  _dom: PreactElement | null;
  /**
   * The last dom child of a Fragment, or components that return a Fragment
   */
  _nextDom: PreactElement | null;
  _component: Component | null;
  _hydrating: boolean | null;
  constructor: undefined;
  _original?: VNode | null | string | number;
}

export type PropsType = {
  // createElementのoption
  is?: string;
  // form
  checked?: any;
  // form
  value?: any;
};

export type Key = string | number | any;

interface Attributes {
  key?: Key;
  jsx?: boolean;
}

type RenderableProps<P> = P &
  Readonly<Attributes & { children?: ComponentChildren }>;

export interface FunctionComponent<P = {}> {
  (props: RenderableProps<P>, context?: any): VNode<any> | null;
  displayName?: string;
  defaultProps?: Partial<P>;
}

export interface FunctionalComponent<P = {}> extends FunctionComponent<P> {
  // Define these properties as undefined on FunctionComponent to get rid of
  // some errors in `diff()`
  getDerivedStateFromProps?: undefined;
  getDerivedStateFromError?: undefined;
}

export interface ClassComponent<P = {}, S = {}> {
  new (props: P, context?: any): Component<P, S>;
  displayName?: string;
  defaultProps?: Partial<P>;
  getDerivedStateFromProps?(
    props: Readonly<P>,
    state: Readonly<S>
  ): Partial<S> | null;
  getDerivedStateFromError?(error: any): Partial<S> | null;
}

export type ComponentType<P = {}, S = {}> =
  | ClassComponent<P, S>
  | FunctionalComponent<P>;
// export type ComponentFactory<P> = ComponentClass<P> | FunctionalComponent<P>;

// interface Context<T> {
//   Consumer: Consumer<T>;
//   Provider: Provider<T>;
// }
// interface Consumer<T>
//   extends FunctionComponent<{
//     children: (value: T) => ComponentChildren;
//   }> {}
// interface PreactConsumer<T> extends Consumer<T> {}
// interface Provider<T>
//   extends FunctionComponent<{
//     value: T;
//     children: ComponentChildren;
//   }> {}

export interface Component<P = {}, S = {}> {
  // When component is functional component, this is reset to functional component
  constructor: ComponentType<P>;
  state: S; // Override Component["state"] to not be readonly for internal use, specifically Hooks
  base?: PreactElement;

  _dirty: boolean;
  _force?: boolean;
  _renderCallbacks: Array<Component>; // Component は実質 () => void
  _globalContext?: any;
  _vnode?: VNode<P> | null;
  // setStateが呼ばれるとこの値に置き換える
  _nextState?: S | null; // Only class components
  /** Only used in the devtools to later dirty check if state has changed */
  _prevState?: S | null;
  /**
   * Pointer to the parent dom node. This is only needed for top-level Fragment
   * components or array returns.
   */
  _parentDom?: PreactElement | null;
  // Always read, set only when handling error
  _processingException?: Component<any, any> | null;
  // Always read, set only when handling error. This is used to indicate at diffTime to set _processingException
  _pendingError?: Component<any, any> | null;
}

export interface ElementHTML extends HTMLElement {
  _children?: VNode<any> | null;
  /** Event listeners to support event delegation */
  _listeners?: Record<string, (e: Event) => void>;

  // Preact uses this attribute to detect SVG nodes
  ownerSVGElement?: SVGElement | null;

  // style: HTMLElement['style']; // From HTMLElement

  data?: string | number; // From Text node
}
interface ElementText extends Text {
  _children?: VNode<any> | null;
  /** Event listeners to support event delegation */
  _listeners?: Record<string, (e: Event) => void>;

  // Preact uses this attribute to detect SVG nodes
  ownerSVGElement?: SVGElement | null;

  // style: HTMLElement['style']; // From HTMLElement
  data: string; // From Text node
}

export type PreactElement = ElementHTML | ElementText;
