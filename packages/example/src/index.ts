import { h, render, Component } from 'sajiact-core';

console.log('h test', h('div', null, 'hello'));

const TestFC = (props) => {
  return h('div', null, [
    h('button', { onclick: props.onclick }, 'hello'),
    h('button', { onclick: props.onclick }, 'hello'),
  ]);
};

// @ts-ignore
class TestCC extends Component {
  constructor() {
    super();
  }

  componentDidMount() {}

  componentWillReceiveProps(next) {}

  render() {
    return h('div', null, [
      h('button', { onclick: this.props.onclick }, 'hello'),
      h('button', { onclick: this.props.onclick }, 'hello'),
    ]);
  }
}
// @ts-ignore
render(
  h(TestFC, { onclick: () => alert('world') }, null),
  document.getElementById('main')
);

// ------------------------------

// // @ts-ignore
// class App extends Component {
//   constructor() {
//     super();
//     this.state = {
//       count: 10000000,
//       data: [],
//     };
//   }

//   componentDidMount() {
//     this.setState({
//       ...this.state,
//       count: 0,
//       data: [
//         {
//           name: 'taro',
//         },
//         {
//           name: 'hanako',
//         },
//       ],
//     });
//   }

//   componentWillReceiveProps(next) {
//     console.log('next.props:', next.props);
//   }

//   render() {
//     return h(
//       'div',
//       {
//         style: {
//           color: 'blue',
//         },
//       },
//       h(
//         'section',
//         null,
//         h('h1', null, 'counting area'),
//         h('span', null, 'count: '),
//         h('span', null, this.state.count),
//         h(
//           'button',
//           {
//             onClick: () =>
//               this.setState({ ...this.state, count: this.state.count + 1 }),
//           },
//           'add'
//         )
//       ),
//       h(
//         'section',
//         null,
//         h('h1', null, 'user data area'),
//         h(
//           'ul',
//           null,
//           this.state.data.map((d, i) =>
//             h(ListItem, {
//               name: d.name,
//               handleDelete: () => {
//                 this.setState({
//                   ...this.state,
//                   data: this.state.data.filter((_, j) => {
//                     return i !== j;
//                   }),
//                 });
//               },
//             })
//           )
//         ),
//         h(
//           'form',
//           {
//             onSubmit: (e) => {
//               e.preventDefault();
//               const userName = e.target['name'].value;
//               this.setState({
//                 ...this.state,
//                 data: [
//                   ...this.state.data,
//                   {
//                     name: userName,
//                   },
//                 ],
//               });
//             },
//           },
//           h('input', {
//             name: 'name',
//           }),
//           h(
//             'button',
//             {
//               type: 'submit',
//             },
//             'add'
//           )
//         )
//       )
//     );
//   }
// }

// // @ts-ignore

// class ListItem extends Component {
//   componentWillReceiveProps(nextProps, prevProps) {
//     console.log('next.props:', nextProps);
//     console.log('next.props:', prevProps);
//   }

//   render() {
//     return h(
//       'li',
//       null,
//       h('span', null, this.props.name),
//       h(
//         'button',
//         {
//           onClick: () => this.props.handleDelete(),
//         },
//         'delete'
//       )
//     );
//   }
// }

// // @ts-ignore

// render(h(App, null, null), document.body);
