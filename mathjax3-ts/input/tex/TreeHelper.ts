/*************************************************************
 *
 *  MathJax/jax/input/TeX/imp.js
 *  
 *  Implements the TeX InputJax that reads mathematics in
 *  TeX and LaTeX format and converts it to the MML ElementJax
 *  internal format.
 *
 *  ---------------------------------------------------------------------
 *  
 *  Copyright (c) 2009-2017 The MathJax Consortium
 * 
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */


// Some helper functionality for generating nodes. This should be eventually
// dissolved.

import {TextNode, MmlNode, AbstractMmlNode, AbstractMmlEmptyNode} from '../../core/MmlTree/MmlNode.js';
import {MmlMo} from '../../core/MmlTree/MmlNodes/mo.js';
import {Property, PropertyList} from '../../core/Tree/Node.js';
import {MmlFactory} from '../../core/MmlTree/MmlFactory.js';
import {MmlMsubsup} from '../../core/MmlTree/MmlNodes/msubsup.js';
import {MmlMunderover} from '../../core/MmlTree/MmlNodes/munderover.js';
import {JsonMmlVisitor} from '../../core/MmlTree/JsonMmlVisitor.js';
import {Args} from './Types.js';
import {OperatorDef} from '../../core/MmlTree/OperatorDictionary.js';


export namespace TreeHelper {

  const factory: MmlFactory = new MmlFactory();
  const visitor: JsonMmlVisitor = new JsonMmlVisitor();

  const attrs: String[] = ['autoOP',
                           'fnOP',
                           'movesupsub',
                           'subsupOK',
                           'texprimestyle',
                           'useHeight',
                           'variantForm',
                           'withDelims',
                           'open',
                           'close'
                          ];

  const methodOut: boolean = false;
  const defOut: boolean = false;
  const jsonOut: boolean = false;
  const simpleOut: boolean = false;
  

  export function createNode(kind: string, children: MmlNode[], def: any, text?: TextNode): MmlNode  {
    const node = factory.create(kind, {}, []);
    // If infinity or -1 remove inferred mrow
    // 
    // In all other cases replace inferred mrow with a regular mrow, before adding
    // children.
    const arity = node.arity;
    if (arity === Infinity || arity === -1) {
      if (children.length === 1 && children[0].isInferred) {
        node.setChildren(TreeHelper.getChildren(children[0]));
      } else {
        node.setChildren(children);
      }
    } else {
      let cleanChildren = [];
      for (let i = 0, child; child = children[i]; i++) {
        if (child.isInferred) {
          let mrow = factory.create('mrow', {}, TreeHelper.getChildren(child));
          TreeHelper.copyAttributes(child, mrow);
          cleanChildren.push(mrow);
        } else {
          cleanChildren.push(child);
        }
      }
      node.setChildren(cleanChildren);
    }
    if (text) {
      node.appendChild(text);
    }
    setProperties(node, def);
    return node;
  };

  export function createText(text: string): TextNode  {
    if (text == null) {
      return null;
    }
    let node = (factory.create('text') as TextNode).setText(text);
    printJSON(node);
    return node;
  };


  export function createEntity(code: string): TextNode  {
    return createText(String.fromCharCode(parseInt(code, 16)));
  };


  export function createError(message: string): MmlNode  {
    let text = createText(message);
    let mtext = createNode('mtext', [], {}, text);
    let error = createNode('merror', [mtext], {});
    return error;
  };


  export function getRoot(tree: MmlNode): MmlNode  {
    return tree;
  };

  export function getChildren(node: MmlNode): (MmlNode|TextNode)[]  {
    return (node.childNodes as (MmlNode|TextNode)[]);
  };


  export function getText(node: TextNode): string {
    return node.getText();
  };


  export function appendChildren(node: MmlNode, children: (MmlNode|TextNode)[]): void  {
    for (let child of children) {
      node.appendChild(child);
    }
  };


  export function setAttribute(node: MmlNode, attribute: string, value: Args): void {
    node.attributes.set(attribute, value);
  };


  // Sets properties and attributes.
  export function setProperties(node: MmlNode, properties: PropertyList): void {
    for (const name of Object.keys(properties)) {
      let value = properties[name];
      if (name === 'texClass') {
        node.texClass = (value as number);
      } else if (name === 'movablelimits') {
        node.setProperty('movablelimits', value);
        if (node.isKind('mo') || node.isKind('mstyle')) {
          node.attributes.set('movablelimits', value);
        }
      } else if (name === 'inferred') {
        // ignore
      } else if (attrs.indexOf(name) !== -1) {
        node.setProperty(name, value);
      } else {
        node.attributes.set(name, value);
      }
    }
  };


  export function getProperty(node: MmlNode, property: string): Property  {
    return node.getProperty(property);
  };


  export function getAttribute(node: MmlNode, attr: string): Property  {
    return node.attributes.get(attr);
  }


  export function removeProperties(node: MmlNode, ...properties: string[]): void {
    node.removeProperty(...properties);
  }

  
  export function getChildAt(node: MmlNode, position: number): MmlNode|TextNode {
    return (node.childNodes[position] as MmlNode|TextNode) ;
  };


  export function setData(node: MmlNode, position: number, child: MmlNode): void  {
    let children = node.childNodes;
    children[position] = child;
    if (child) {
      child.parent = node;
    }
  };


  export function copyChildren(oldNode: MmlNode, newNode: MmlNode): void {
    let children = oldNode.childNodes as (TextNode|MmlNode)[];
    for (let i = 0; i < children.length; i++) {
      setData(newNode, i, children[i]);
    }
  };


  export function copyAttributes(oldNode: MmlNode, newNode: MmlNode): void  {
    newNode.attributes = oldNode.attributes;
    setProperties(newNode, oldNode.getAllProperties());
  };


  export function isType(node: MmlNode, kind: string)  {
    return node.isKind(kind);
  };

  export function isEmbellished(node: MmlNode): boolean {
    return node.isEmbellished;
  };
  
  export function getTexClass(node: MmlNode): number  {
    return node.texClass;
  };

  export function getCore(node: MmlNode): MmlNode  {
    return node.core();
  };

  export function getCoreMO(node: MmlNode): MmlNode  {
    return node.coreMO();
  };

  // TODO: reduce some of the casting.
  export function cleanSubSup(node: MmlNode): MmlNode  {
    let rewrite: MmlNode[] = [];
    node.walkTree((n, d) => {
      const children = n.childNodes;
      if ((n.isKind('msubsup') && (!children[(n as MmlMsubsup).sub] ||
                                   !children[(n as MmlMsubsup).sup])) ||
          (n.isKind('munderover') && (!children[(n as MmlMunderover).under] ||
                                      !children[(n as MmlMunderover).over]))) {
        d.unshift(n);
      }
    }, rewrite);
    for (const n of rewrite) {
      const children = n.childNodes as (MmlNode|TextNode)[];
      const parent = n.parent;
      let ms, newNode;
      if (n.isKind('msubsup')) {
        ms = n as MmlMsubsup;
        newNode = (children[ms.sub] ?
                   createNode('msub', [children[ms.base], children[ms.sub]], {}) :
                   createNode('msup', [children[ms.base], children[ms.sup]], {}));
      } else {
        ms = n as MmlMunderover;
        newNode = (children[ms.under] ?
                   createNode('munder', [children[ms.base], children[ms.under]], {}) :
                   createNode('mover', [children[ms.base], children[ms.over]], {}));
      }
      copyAttributes(n, newNode);
      if (parent) {
        parent.replaceChild(newNode, n);
      } else {
        node = newNode;
      }
    }
    return node;
  };

  
  export function printSimple(txt: string): void  {
    if (simpleOut) {
      console.log(txt);
    }
  };

  export function untested(kind: string|number): void  {
    console.log('Untested case ' + kind);
  };

  export function printMethod(text: string): void  {
    if (methodOut) {
      console.log('In ' + text);
    }
  };

  export function printJSON(node: MmlNode): void  {
    if (jsonOut) {
      console.log(visitor.visitNode(node));
    }
  };

  export function printDef(def: PropertyList): void  {
    if (methodOut && defOut) {
      console.log('With:');
      for (let x in def) {
        console.log(x + ': ' + def[x]);
      }
    }
  };

  export function isNode(item: any): boolean  {
    return item instanceof AbstractMmlNode || item instanceof AbstractMmlEmptyNode;
  };

  
  export function isInferred(node: MmlNode): boolean {
    return node.isInferred;
  };

  export function getForm(node: MmlNode): OperatorDef {
    if (!TreeHelper.isType(node, 'mo')) {
      return null;
    }
    let mo = node as MmlMo;
    let forms = mo.getForms();
    for (let form of forms) {
      let symbol = MmlMo.OPTABLE[form][mo.getText()];
      if (symbol) {
        return symbol;
      }
    }
    return null;
  };
  
}

