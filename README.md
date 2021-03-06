## NatsX
 <p>Reactive <a href="http://nats.io" target="_blank">Nats</a> client and RxJS wrapper for <a href="https://github.com/nats-io/nats.ts" target="_blank">ts-nats</a></p>

 <a href="https://www.npmjs.com/~natsx" target="_blank"><img src="https://img.shields.io/npm/v/natsx.svg"
      alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/~natsx" target="_blank"><img src="https://img.shields.io/npm/l/natsx.svg"
      alt="Package License" /></a>
  <a href="https://www.npmjs.com/~natsx" target="_blank"><img
      src="https://img.shields.io/npm/dm/natsx.svg" alt="NPM Downloads" /></a>
 ### Installation

```bash
$ npm i --save natsx
```

## Usage
The main purpose of the library is to manage nats subscription behavior with RxJS operators like _`take`_ and _`timeout`_.

You can pass a nats client or use connect() method of NatsX to initalize the wrapper

```ts
import { connect, Msg } from 'ts-nats';
import { NatsX } from 'natsx';

const rawClient = await connect({servers: ['nats://demo.nats.io:4222', 'tls://demo.nats.io:4443']});
const client = new NatsX(rawClient);
client.from('greeting').subscribe((msg: Msg) => { ... })
```

To unsubscribe from nats subscription, you must unsubscribe from the observable with operators or manually.

```ts
// that will get 3 greeting messages then unsubscribe from nats subscription
client.from('greeting')
  .pipe(
    take(3)
  )
  .subscribe((msg: Msg) => { ... })
```

To achieve the same ability for nats requests, we are not using the <a href="https://github.com/nats-io/nats.ts" target="_blank">ts-nats</a> request method directly. You must manage your subscription same way of _`from`_ method of NatsX

```ts
// that will wait a response for 2 seconds then throw timeout error and unsubscribe from reply subject.
client.request('greeter', 'me')
  .pipe(
    timeout(2000)
  )
  .subscribe((msg: Msg) => { ... })
```

Also, you can use other methods like _`publish`_, _`close`_, _`drain`_ and listen the connection status with _`status$`_, and other nats events with _`error$`_, _`subscriptions$`_,  _`serverChanged$`_, _`yield$`_

### Contributing

You are welcome to contribute to this project, just open a PR.
### License

- NatsX is [MIT licensed](LICENSE).