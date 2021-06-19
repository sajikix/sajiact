import { EMPTY_OBJ, EMPTY_ARR } from '../constants';
import {
  PropsType,
  VNode,
  PreactElement,
  ComponentType,
  ComponentChildren,
} from 'src/interface';
import { diff, unmount } from '.';
import { getDomSibling } from '../component';
import { createVNode, Fragment } from '../create-element';

interface DiffChildrenArg {
  parentDom: PreactElement;
  /** diffElementNodesからchildrenが渡される */
  renderResult: ComponentChildren[];
  /** [renderResult]がdiffから渡される */
  newParentVNode: VNode;
  /** diff が持ってる　oldVNode が渡される. 呼び出されるたびに  */
  oldParentVNode: VNode<PropsType> | typeof EMPTY_OBJ;
  excessDomChildren: PreactElement[];
  commitQueue: ComponentType[];
  oldDom: Element | Text | typeof EMPTY_OBJ;
}

export const diffChildren = ({
  oldParentVNode,
  oldDom,
  newParentVNode,
  renderResult,
  parentDom,
  excessDomChildren,
  commitQueue,
}: DiffChildrenArg) => {
  let i, j, newDom, firstChildDom, filteredOldDom: Element | Text | null;

  console.log('diffChildren:renderResult.length', renderResult.length);

  // 以前の子Vnode
  const oldChildren =
    (oldParentVNode &&
      '_children' in oldParentVNode &&
      oldParentVNode._children) ||
    EMPTY_ARR;
  const oldChildrenLength = oldChildren.length;

  // diffElementNodes から呼ばれたときは oldDOM には EMPTY_OBJ が渡されている
  // 基本excessDomChildrenが生じてない限りはundefined
  if (oldDom == EMPTY_OBJ) {
    if (oldChildrenLength && 'type' in oldParentVNode) {
      filteredOldDom = getDomSibling(oldParentVNode, 0);
    } else {
      filteredOldDom = null;
    }
  }

  // newParentVNodeの_childrenを初期化
  newParentVNode._children = [];
  let childVNode, oldVNode;

  // renderResultの分だけ回す
  for (i = 0; i < renderResult.length; i++) {
    // vnodeといいつつまだVNode型ではない ChildのArray
    childVNode = renderResult[i];

    if (childVNode == null || typeof childVNode == 'boolean') {
      // JSXの中に{null}とか{true}を入れてる場合の挙動
      childVNode = newParentVNode._children[i] = null;
    } else if (typeof childVNode == 'string' || typeof childVNode == 'number') {
      // JSXの中に{1}とか{"1"}を入れてる場合の挙動
      childVNode = newParentVNode._children[i] = createVNode(
        null,
        childVNode,
        null,
        null,
        childVNode
      );
    } else if (Array.isArray(childVNode)) {
      // child が 配列 の場合
      // → JSXの中に{[1, <div>hoge</div>]}などを入れてる時
      // FragmentとしてcreateVnodeする
      childVNode = newParentVNode._children[i] = createVNode(
        //@ts-ignore TODO:
        Fragment,
        { children: childVNode },
        null,
        null,
        null
      );
    } else if (childVNode._dom != null || childVNode._component != null) {
      // child が element の場合(一般的なHTMLのエレメント)
      childVNode = newParentVNode._children[i] = createVNode(
        childVNode.type,
        childVNode.props,
        childVNode.key,
        null,
        childVNode._original
      );
    } else {
      // child が コンポーネントの場合
      childVNode = newParentVNode._children[i] = childVNode;
    }

    // Terser removes the `continue` here and wraps the loop body
    // in a `if (childVNode) { ... } condition
    if (childVNode == null) {
      continue;
    }
    // 作りだしたVNodeの親が何か記録する
    childVNode._parent = newParentVNode;
    childVNode._depth = newParentVNode._depth + 1;

    // Check if we find a corresponding element in oldChildren.
    // If found, delete the array item by setting to `undefined`.
    // We use `undefined`, as `null` is reserved for empty placeholders
    // (holes).
    oldVNode = oldChildren[i];

    // oldVNode = oldChildren[i]がnullなら　新しく作ったchildVNodeと同じkeyのoldChildrenがあったか確認
    // あったらoldChildrenにundefinedを入れる
    if (
      oldVNode === null ||
      (oldVNode &&
        childVNode.key == oldVNode.key &&
        childVNode.type === oldVNode.type)
    ) {
      oldChildren[i] = undefined;
    } else {
      // Either oldVNode === undefined or oldChildrenLength > 0,
      // so after this loop oldVNode == null or oldVNode is a valid value.
      // 新しく作ったchildVNodeと同じkeyのoldChildrenがあったか確認
      // あったらoldChildrenにundefinedを入れる
      for (j = 0; j < oldChildrenLength; j++) {
        oldVNode = oldChildren[j];
        // If childVNode is unkeyed, we only match similarly unkeyed nodes, otherwise we match by key.
        // We always match by type (in either case).
        if (
          oldVNode &&
          childVNode.key == oldVNode.key &&
          childVNode.type === oldVNode.type
        ) {
          oldChildren[j] = undefined;
          break;
        }
        oldVNode = null;
      }
    }

    oldVNode = oldVNode || EMPTY_OBJ;

    // Morph the old element into the new one, but don't append it to the dom yet
    // またdiffを呼びその返り値をnewDomとする
    newDom = diff({
      parentDom: parentDom, // diff から渡された parentDom を使ってまた diff を呼び出す.
      newVNode: childVNode, // diff の renderResult の要素を newVNode として diff に渡す.
      oldVNode: oldVNode, // oldVNode は親から渡されたもの or EMPTY_OBJ. key不一致ならEMPTY_OBJが渡される.
      excessDomChildren: excessDomChildren,
      commitQueue: commitQueue,
      oldDom: filteredOldDom,
    });

    // 新しいDOMがあれば挿入する
    if (newDom != null) {
      if (firstChildDom == null) {
        firstChildDom = newDom;
      }

      // 子要素を実際に追加
      // ついでにoldDomを更新する
      filteredOldDom = placeChild({
        parentDom: parentDom,
        childVNode: childVNode,
        oldVNode: oldVNode,
        oldChildren: oldChildren,
        excessDomChildren: excessDomChildren,
        newDom: newDom,
        oldDom: filteredOldDom,
      });

      if (typeof newParentVNode.type == 'function') {
        newParentVNode._nextDom = filteredOldDom as PreactElement;
      }
    }
  }

  // TODO
  newParentVNode._dom = firstChildDom;

  // Remove remaining oldChildren if there are any.
  // oldChildrenにundefinedが入っていないものは全てunmount
  // for ループの中で使用済みのものには undefined が詰め込まれているはず。
  // それでも余っているものをここでunmountする
  for (i = oldChildrenLength; i--; ) {
    if (oldChildren[i] != null)
      unmount(oldChildren[i], oldChildren[i], undefined);
  }
};

type PlaceChildArgType = {
  parentDom: PreactElement;
  childVNode: VNode;
  oldVNode: VNode;
  oldChildren: ComponentChildren;
  excessDomChildren: ComponentChildren;
  newDom: Node | Text;
  oldDom: Node | Text;
};

export function placeChild(arg: PlaceChildArgType): PreactElement {
  let {
    parentDom,
    childVNode,
    oldVNode,
    oldChildren,
    excessDomChildren,
    newDom,
    oldDom,
  } = arg;

  let nextDom;
  if (childVNode._nextDom !== undefined) {
    nextDom = childVNode._nextDom;
    childVNode._nextDom = undefined;
  } else if (
    excessDomChildren == oldVNode ||
    newDom != oldDom ||
    newDom.parentNode == null
  ) {
    outer: if (oldDom == null || oldDom.parentNode !== parentDom) {
      // 親が異なるなら兄弟ではないので子要素を追加
      parentDom.appendChild(newDom);
      nextDom = null;
    } else {
      // 親が同じなら兄弟要素を追加
      if (!Array.isArray(oldChildren)) {
        throw new Error('配列であるべき');
      }
      for (
        let sibDom = oldDom, j = 0;
        (sibDom = sibDom.nextSibling) && j < oldChildren.length;
        j += 2
      ) {
        if (sibDom == newDom) {
          break outer;
        }
      }
      parentDom.insertBefore(newDom, oldDom);
      nextDom = oldDom;
    }
  }

  if (nextDom !== undefined) {
    oldDom = nextDom;
  } else {
    oldDom = newDom.nextSibling;
  }

  return oldDom as PreactElement;
}
