import { PreactElement, ElementHTML, PropsType } from '../interface';
import { IS_NON_DIMENSIONAL } from '../constants';

export const diffProps = (
  dom: PreactElement,
  newProps: PropsType,
  oldProps: PropsType
) => {
  let propsKey: string;

  for (propsKey in oldProps) {
    if (
      propsKey !== 'children' &&
      propsKey !== 'key' &&
      !(propsKey in newProps)
    ) {
      // 新しいpropsでkeyがなくなっている場合 newValueはnullに
      setProperty(dom, propsKey, null, oldProps[propsKey]);
    }
  }

  for (propsKey in newProps) {
    if (
      propsKey !== 'children' &&
      propsKey !== 'key' &&
      propsKey !== 'value' &&
      propsKey !== 'checked' &&
      oldProps[propsKey] !== newProps[propsKey]
    ) {
      // 新しいPropsが過去のPropsと異なる場合
      setProperty(dom, propsKey, newProps[propsKey], oldProps[propsKey]);
    }
  }
};

const setStyle = (style: CSSStyleDeclaration, key: string, value: any) => {
  if (key[0] === '-') {
    style.setProperty(key, value);
  } else if (value == null) {
    style[key] = '';
  } else if (typeof value != 'number' || IS_NON_DIMENSIONAL.test(key)) {
    style[key] = value;
  } else {
    style[key] = value + 'px';
  }
};

export const setProperty = (
  dom: PreactElement, //TODO 型合わない
  name: string,
  newValue: any,
  oldValue: any
) => {
  // style属性の書き換え(Textは無理っぽいので除外)
  if (name === 'style' && 'style' in dom) {
    if (typeof newValue == 'string') {
      dom.style.cssText = newValue;
    } else {
      if (typeof oldValue == 'string') {
        dom.style.cssText = oldValue = '';
      }

      if (oldValue) {
        for (name in oldValue) {
          if (!(newValue && name in newValue)) {
            setStyle(dom.style, name, '');
          }
        }
      }

      if (newValue) {
        for (name in newValue) {
          if (!oldValue || newValue[name] !== oldValue[name]) {
            setStyle(dom.style, name, newValue[name]);
          }
        }
      }
    }
  } else if (name[0] === 'o' && name[1] === 'n') {
    //onHoge系のイベントハンドラの場合
    //
    const useCapture = name !== (name = name.replace(/Capture$/, ''));

    // Infer correct casing for DOM built-in events:
    // 小文字化してdomの型にある既存のやつだったら小文字化したままonだけ削る
    if (name.toLowerCase() in dom) name = name.toLowerCase().slice(2);
    // そうじゃなくてもonだけ削る
    else name = name.slice(2);

    // _listenersいなかったら作る
    if (!dom._listeners) dom._listeners = {};
    dom._listeners[name + useCapture] = newValue;

    if (newValue) {
      if (!oldValue) {
        const handler = useCapture ? eventProxyCapture : eventProxy;
        dom.addEventListener(name, handler, useCapture);
      }
    } else {
      const handler = useCapture ? eventProxyCapture : eventProxy;
      dom.removeEventListener(name, handler, useCapture);
    }
  } else if (name !== 'dangerouslySetInnerHTML' && 'setAttribute' in dom) {
    if (
      name !== 'href' &&
      name !== 'list' &&
      name !== 'form' &&
      // Default value in browsers is `-1` and an empty string is
      // cast to `0` instead
      name !== 'tabIndex' &&
      name !== 'download' &&
      name in dom
    ) {
      dom[name] = newValue == null ? '' : newValue;
      // labelled break is 1b smaller here than a return statement (sorry)
    } else if (typeof newValue === 'function') {
      // never serialize functions as attribute values
    } else if (
      newValue != null &&
      (newValue !== false || (name[0] === 'a' && name[1] === 'r'))
    ) {
      // ARIA-attributes have a different notion of boolean values.
      // The value `false` is different from the attribute not
      // existing on the DOM, so we can't remove it. For non-boolean
      // ARIA-attributes we could treat false as a removal, but the
      // amount of exceptions would cost us too many bytes. On top of
      // that other VDOM frameworks also always stringify `false`.
      // ariaラベルへの処理
      dom.setAttribute(name, newValue);
    } else {
      dom.removeAttribute(name);
    }
  }
};

function eventProxy(e: Event) {
  this._listeners[e.type + false](e);
}

function eventProxyCapture(e: Event) {
  this._listeners[e.type + true](e);
}
