import { VNode } from './interface';

export function assign(obj: Object, props: Object) {
  for (let i in props) obj[i] = props[i];
  return /** @type {O & P} */ obj;
}
export function removeNode(node: Node) {
  let parentNode = node.parentNode;
  if (parentNode) parentNode.removeChild(node);
}
