---
thumbnail: http://p5zd0id9p.bkt.clouddn.com/18-8-30/57038989.jpg
title: 线程间通信 下篇
tags: [读书笔记, Efficient.Android.Threading]
date: 2018-09-09
---

> Efficient.Android.Threading 第四章读书笔记 下篇

<!--more-->

### Android 消息机制

迄今为止，我们介绍的线程通信都是 Java 层面的，管道、共享内存、阻塞队列等等，都是所有 Java 应用都有的机制。然而，因为阻塞线程特性的存在，这些机制对于 Android 系统都不适用，因为 UI 线程绝不允许阻塞。

因此，Android 系统为了协同 UI 线程和工作线程，定义了一套系统级别的消息机制。Android 消息机制是一个没有阻塞状态的生产者-消费者模式，UI 线程可以将耗时操作转移给工作线程在后台处理，同时生产者线程与消费者线程都不会发生阻塞。

Android 平台的消息机制相关的 API 从属于 `android.os` 包：

![Android Message API](http://p5zd0id9p.bkt.clouddn.com/18-9-11/81397663.jpg)

`android.os.Looper`

唯一关联某个消费者线程的消息调度器

`android.os.Handler`

消费者线程的消息处理器，同时生产者线程也使用该对象将消息插入队列。一个 Looper 对象可以绑定多个 Handler 对象，但是所有的消息都是插入同一个消息队列的。

`android.os.MessageQueue`

消费者线程中待处理消息的链表，但是不同的消息之间并没有绑定关系。每个 Looper 对象最多只能有一个消息队列；由于每个线程只能有一个 Looper 对象，也就是说每个线程最多只能有一个消息队列。

名叫 MessageQueue, 实际上是一个 LinkedList

`android.os.Message`

消费者线程中待执行的消息

消息机制的工作原理大抵如下图示意：

![消息机制示意](http://p5zd0id9p.bkt.clouddn.com/18-9-16/18254263.jpg)

生产者线程发送消息，消费者线程处理消息：

1. 插入：生产者线程使用与消费者线程相绑定的 Handler 对象，将消息插入消息队列
2. 取出：Looper 运行在消费者线程中，按一定的顺序取出消息队列中的消息
3. 分发：Handler 负责在消费者线程中处理消息；某个线程可以有多个 Handler 对象，Looper 可以确保每条消息能够正确分发给对应的 Handler 。

#### 消息传递基本示例

```java
public class LooperActivity extends Activity {

    LooperThread mLooperThread;

    // 1.声明一个工作线程，扮演消费者线程角色
    private static class LooperThread extends Thread {

        public Handler mHandler;

        public void run() {
            // 2.为当前线程关联 Looper，也就是关联了 MessageQueue
            Looper.prepare();
            // 3.使用默认构造器，即将 Handler 与当前线程的 Looper 绑定
            // 也就决定了它只能在 Looper.prepare() 后初始化，否则没有可以绑定的 Looper
            mHandler = new Handler() {
                // 4. 工作线程中处理分发下来的消息的回调
                public void handleMessage(Message msg) {
                    if(msg.what == 0) {
                        doLongRunningOperation();
                    }
                }
            };
            // 5. 开启对消息队列的轮询，对消息进行分发；
            // 这是个 blocking call，因此此工作线程不会结束
            Looper.loop();
        }

        private void doLongRunningOperation() {
            // Add long running operation here.
        }
    }

    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_looper);
        // 6. 开启工作线程，准备处理消息
        mLooperThread = new LooperThread();
        mLooperThread.start();
    }

    public void onClick(View v) {
        // 7. Handler 初始化完成和点击事件是异步的，因次校验一下 Handler 不为空
        if (mLooperThread.mHandler != null) {
            // 8. 初始化一个 Message 对象，what 属性赋值为 0
            Message msg = mLooperThread.mHandler.obtainMessage(0);
            // 9. 向消息队列中插入消息
            mLooperThread.mHandler.sendMessage(msg);
        }
    }

    protected void onDestroy() {
        super.onDestroy();
        // 10. 结束 loop() 方法的阻塞状态，从而结束后台线程的执行
        mLooperThread.mHandler.getLooper().quit();
    }
}
```

#### 消息传递过程中涉及到的 Classes

##### MessageQueue

消息队列主要由 `android.os.MessageQueue` 类来实现，其内部实现一个没有绑定关系的单向链表，用于存储一系列待处理的消息。生产者线程插入消息，之后消息会分发到对应的消费者线程去处理。一般来讲，不同的消息是按照时间戳来排序的。也就是说，时间戳值越小，在消息队列中排序顺序就越靠前。但是只有到达当前时间的消息才会被分发；如果还没有到当前时间，则会等到当前时间才会对消息进行分发。

![消息分发的时间点](http://p5zd0id9p.bkt.clouddn.com/18-11-8/3423119.jpg)

上图展示了消息队列中按时间排序的消息是如何向下分发的，其中 t1 < t2 < t3，即 t1 的时间要早于 t3。现在只有一条消息越过了 `disptch barrier` , 实际上也就是当前时间点。可以被分发下去的消息所绑定的时间戳，一定比当前时间小，也就是已经到了分发的时间。

如果当前 Looper 获取消息时，消息队列中还没有消息穿越过 `dispatch barrier` ，此时消费者线程就会阻塞，直到有消息越过 `dispatch barrier` 。而生产者线程可以在任何时间、任意位置插入消息，因为消息列表的排列只和消息发送的时间有关系，如果需要插入一条立即发送的消息，则即使消息队列中有一百条待发送的消息，但它们都是一分钟后才发送，那刚插入的这条消息也会在链表的首位，也就是下一个被分发的消息。

##### MessageQueue.IdleHandler

正常来讲，如果 Looper 获取不到应分发的消息时，线程就会阻塞等待；但是除了干等以外，还可以将这段时间利用起来，用来执行一些其他的任务。而这个任务则由 `android.os.MessageQueue.IdleHandler` 来完成。

```java
/**
 * 当线程等待新消息，即将进入阻塞（闲置）状态时的回调接口
 */
public static interface IdleHandler {  
    boolean queueIdle();
}

// 具体使用：
// 获取当前线程的消息队列
MessageQueue myQueue = Looper.myQueue();
// 声明一个 IdleHandler 对象
MessageQueue.IdleHandler idleHandler = new MessageQueue.IdleHandler() {
    @Override
    public boolean queueIdle() {
        return false;
    }
};
// 与消息队列进行绑定
myQueue.addIdleHandler(idleHandler);
// 与消息队列解除绑定
myQueue.removeIdleHandler(idleHandler);

```

当消息队列检测到分发消息的空闲时间时，它会唤醒所有注册到当前消息队列的 IdleHandler 实例，并调用他们的 `queueIdle` 方法，而具体的回调由应用自身来进行实现。

 `queueIdle` 方法返回值为布尔类型：

- true

  当前 IdleHandler 实例保持存活，下次再有 time slots 时，MessageQueue 还会唤醒该实例

- false

  当前 IdleHandler 实例不再存活，处理完消息后就会主动调用 MessageQueue.removeIdleHandler() 将该实例与 MessageQueue 解绑

##### 使用 IdleHandler 来终止闲置线程的运行

假定现在有多个生产者线程要连续不断的向消费者线程发送消息，那就可以在消费者线程将所有任务的处理完以偶胡，使用 IdleHandler 来终止线程的执行，从而保证该线程对象不会在内存中游荡。

在这种情况下使用 IdleHandler ，就不用追踪最后一条插入队列的消息，以期得到回收该线程的确切时间。

不过这种场景只适用于生产者线程连续不断地向消费者线程插入消息，从而保证在处理完所有消息之前，消费者线程都没有 time slots.

```java
public class ConsumeAndQuitThreadActivity extends Activity {
    
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        final ConsumeAndQuitThread consumeAndQuitThread = new ConsumeAndQuitThread();
        consumeAndQuitThread.start();
        for (int i = 0; i < 10; i++) {
            // 由多个线程并发向消费者线程发送消息，随机模拟发送的时间
            new Thread(new Runnable() {
                @Override
                public void run() {
                    for (int i = 0; i < 10; i++) {
                        SystemClock.sleep(new Random().nextInt(10));
                        consumeAndQuitThread.enqueueData(i);
                    }
                }
            }).start();
        }
    }

    /**
     * 此线程为绑定了 Looper 对象的消费者线程，接收生产者线程的消息并进行处理；
     * 处理完消息后，会终止 Looper.loop() 方法，结束线程的执行
     */
    private static class ConsumeAndQuitThread extends Thread implements MessageQueue.IdleHandler {

        private static final String THREAD_NAME = "ConsumeAndQuitThread";

        public Handler mConsumerHandler;
        private boolean mIsFirstIdle = true;

        public ConsumeAndQuitThread() {
            super(THREAD_NAME);
        }

        @Override
        public void run() {
            Looper.prepare();

            mConsumerHandler = new Handler() {
                @Override
                public void handleMessage(Message msg) {
                    // Consume data
                }
            };
            // 1. 为当前线程初始化 Looper，并为该线程的消息队列绑定 IdleHandler 对象
            Looper.myQueue().addIdleHandler(this);
            Looper.loop();
        }


        @Override
        public boolean queueIdle() {
            // 2. 第一次 queueIdle() 的调用会发生在接收消息之前
            // 因此需要让首次调用返回 true，从而保证此对象仍然与消息队列绑定
            if (mIsFirstIdle) { 
                mIsFirstIdle = false;
                return true;
            }
            // 3. 结束消费者线程的执行
            mConsumerHandler.getLooper().quit();
            return false;
        }

        public void enqueueData(int i) {
            mConsumerHandler.sendEmptyMessage(i);
        }
    }
}
```



##### Message

Message 是一个容器类，可以承载各种类型的数据或者一个 Runnable 对象，但是不能同时携带二者。所携带的数据会在消费者线程被处理，但任务则会在消息分发时直接得到执行，而不需要调用者做其他额外的工作。

正常来讲，Message 的插入由 Handler 来完成，因为它在插入消息时有更多的选择，更加灵活；但是实际上每条消息对象都知道自己对应的处理器是谁，也就是知道自己对应的 Handler 对象，所以一条消息可以自己实现入队操作。

```java
// 通过 obtain() 传递一个 Handler 对象进去，赋值给 Message.target 属性
Message m = Message.obtain(handler, runnbale);
m.sendToTarget();

public void sendToTarget() {
    // target 是 Handler 对象，此方法会调用 Handler 的 sendMessage 方法
	target.sendMessage(this);
}
```

如之前所说，Message 可以携带数据或者任务，具体如下图所示：

![](http://p5zd0id9p.bkt.clouddn.com/18-11-14/7124044.jpg)

消息队列可以包含任何数据和任务消息的组合，消费者线程具体在处理消息的时候，也仅仅是按照消息的排序顺序，而不和消息的类型有任何关系。如果消息携带的是数据，那消费者线程就会在 handleMessage 中处理数据；如果消息携带的是任务，则该 Runnable 的 run 方法则会在消费者线程得到执行，但是不会再触发 handleMessage 方法的回调。

Message 的生命周期大概可以分为四个方面：初始化，等待，分发，回收。需要注意的是，系统并没有对消息的状态进行监听，尽管这在技术上也是可行的，所以应用在处理消息不该对该消息的当前状态做出任何假设。

- Initialized

  在初始化状态下，应用程序可以使用以下方法来创建 Message 对象：

  - 使用构造器初始化

    ```java
    Message m = new Message();
    ```

  - 工厂方法

    - 空消息

      ```java
      Message m = Message.obtain();
      ```

    - 数据消息

      ```java
      Message m = Message.obtain(Handler h);
      Message m = Message.obtain(Handler h, int what);
      Message m = Message.obtain(Handler h, int what, Object o);
      Message m = Message.obtain(Handler h, int what, int arg1, int arg2); 
      Message m = Message.obtain(Handler h, int what, int arg1, int arg2, Object o);
      ```

    - 任务消息

      ```java
      Message m = Message.obtain(Handler h, Runnable task);
      ```

    - 复制构造器

      ```java
      Message m = Message.obtain(Message originalMsg);
      ```

- Pending

  消息已经被插入消息队列中，但还没到发送时间，正在等待分发

- Disptached

  在这个阶段，Looper 已经从消息队列中取出了消息，消息队列也将其移除。Looper 在 loop 方法中，会通过访问 Message.target 属性，来获取到该消息对应的 Handler ，然后将消息发送到对应的回调中进行处理。

- Recycled

  在这个阶段，Message 的状态被清除，该实例也回到了消息池中等待复用。在消费者线程完成数据处理后，Looper 负责 Message 的回收工作。这个回收过程由虚拟机来完成，而不应该由应用程序来主动处理。

  > 需要注意的是，一旦消息入队后，其携带的数据就不应该再被更改。理论上来讲，在消息被分发之前，对数据做出的更改都是有效的。但由于 Handler 机制在设计之初就没有对 Message 的处理状态进行监听，因此调用者正在对数据进行更改时，消费者线程正在处理数据，从而导致线程安全的问题。而如果该消息对象已经被回收了，问题则会更加严重，因为该对象回到消息池后，会在之后被应用程序所复用，有可能会携带之前的数据到新的消息队列中。



##### Looper

`android.os.Looper` 复杂将队列中的消息分发给对应的 Handler 去处理。所有越过分发栅栏的消息都可以被 Looper 所分发。所有待分发的消息一定是越过分发栅栏的，当没有消息待分发时，消费线程则会阻塞，直至有消息等待处理。

消费线程并不直接与消息队列发生关系，而是通过 Looper 作为中间者来协调消息的分发与处理：消费电车绑定 Looper，而 Looper 会绑定一个 MessageQueue。默认只有 UI 线程自带 Looper ，其他子线程需要调用者显式声明 Looper 。

```java
new Thread() {
    @Override
    public void run() {
        // prepare() 方法会初始化一个消息队列，并将其与当前线程绑定
        // 在此时，该消息队列已经可以插入消息，但是无法分发到消费线程处理
        Looper.prepare();
        
        // ... ...
        
        // 此方法为一个 blocking call，确保 run() 方法不会结束执行
        // 当 run() 方法阻塞的时候，Looper 可以循环消息队列，然后向消费线程分发消息
        Looper.loop();
    }
}.start();
```

一个线程只能绑定一个 Looper，而 Looper 会绑定一个 MessageQueue，也就是说一个线程只能有一个消息队列；这也就保证了无论多少工作线程向主线程发送消息，主线程也只能按照一定顺序来处理消息。因此，当前执行的消息处理时间的长短会影响到之后的消息，我们在实际使用时，应该规避处理耗时过长的消息。

##### Looper 的终止

- quit()

  丢弃消息队列中所有未分发的消息，不管其有没有越过分发栅栏

- quitSafely()

  丢弃还没越过分发栅栏的消息，Looper 会等到已经处于待分发状态的消息正确分发后再结束

终止 Looper 并不会终止线程的执行，它只是将 loop() 方法结束了；但需要注意的是，终止 Looper 后此线程将不再是 Looper 线程，既不能重新绑定新的 Looper ，也无法唤醒已经终止的 Looper。调用 Looper.prepare() 会抛异常，提示已经绑定；重新调用 Looper.loop() 会进入阻塞状态，但是消息队列中的消息不会再得到分发。

##### UI 线程的 Looper

UI 线程是唯一一个自带 Looper 的线程，其与其他线程有以下几点不同：

- 在程序任何位置都可以通过调用 Looper.getMainLooper() 来获取 UI Looper
- UI 线程的 Looper 不能被终止
- Java 虚拟机通过 Looper.prepareMainLooper() 为 UI 线程初始化 Looper，此动作只能执行一次，因此尝试将 main looper 与其他子线程关联会抛异常。



##### Handler

Android 系统中使用 `android.os.Handler` 来协调工作线程与 UI 线程的调度，消息的插入和处理都由它来完成，具体工作包括以下几点：

- 消息的创建
- 插入消息
- 在消费线程中处理消息
- 管理消息队列中的消息

Handler 的工作需要 Looper 和 MQ 的支持，因此 Handler 在声明时就应该绑定 Looper 对象：

1. 构造器中不接收 Looper 的，该 Handler 与当前线程绑定

   ```java
   // 这种与当前线程绑定的，如果当前不是 Looper 线程，就会抛出异常
   new Handler();
   new Handler(Handler.Callback);
   ```

2. 构造器明确需要传入 Looper 对象的

   ```java
   new Handler(Looper);
   new Handler(Looper, Handler.Callback);
   ```

一个线程可以有多个 Handler ，不同 Handler 发送的消息可以在消息队列中共存，并不会有什么冲突；具体在分发的时候又会通过 Message 的 target 属性发送回该消息对应的 Handler：

![](http://p5zd0id9p.bkt.clouddn.com/18-11-16/56491345.jpg)

> 多个 Handler 发出的消息也不会导致并发，Message 的处理仍然是按顺序执行的。

##### Message creation

Handler 可以通过以下几个包装方法直接获取 Message 对象，而这些对象则会和 Handler 发生绑定关系：

```java
// 这些方法内部都会调用 Message.obtain() 方法，并将 Handler 传入，从而产生绑定关系
Message obtainMessage(int what, int arg1, int arg2)
Message obtainMessage()
Message obtainMessage(int what, int arg1, int arg2, Object obj) 
Message obtainMessage(int what)
Message obtainMessage(int what, Object obj)
```

##### Message insertion

根据消息类型的不同，Handler 插入消息的方式也略有差别。

```java
// 携带任务的消息，使用 postXxx() 方法
boolean post(Runnable r)
boolean postAtFrontOfQueue(Runnable r)
boolean postAtTime(Runnable r, Object token, long uptimeMillis) 
boolean postAtTime(Runnable r, long uptimeMillis)
boolean postDelayed(Runnable r, long delayMillis)
    
// 携带数据的消息或者空消息，使用 sendXxx() 方法
// 默认，立即分发
boolean sendMessage(Message msg) 
// 下一个分发
boolean sendMessageAtFrontOfQueue(Message msg)
// 指定某个确切的时间进行分发
boolean sendMessageAtTime(Message msg, long uptimeMillis) 
boolean sendMessageDelayed(Message msg, long delayMillis)
boolean sendEmptyMessage(int what)
boolean sendEmptyMessageAtTime(int what, long uptimeMillis) 
boolean sendEmptyMessageDelayed(int what, long delayMillis)
```

每条消息都有会有一个 when 属性，用来记录当前消息应该何时被分发；该属性也是唯一一个会影响分发顺序的因素。需要注意的是，尽管我们可以指定确定的时机分发，但是由于之前消息的处理也会影响到后一条消息的分发，因此这个时间还是不确定的。

向消息队列中插入消息时，有可能导致某些错误的产生：

- Message has no Handler

  Message was created from a Message.obtain() method without a specified Handler.

- Message has already been disptached and is being processed

  The same message instance was inserted twice.

- Looper has exited

  Message is inserted after Looper.quit() has been called.

> Looper 在分发消息时，会调用 Handler 的 dispatchMessage 方法。如果此方法被应用程序主动调用，那该消息会在发起调用的线程立即得到执行，而不是在消费线程执行。

##### Message processing

Message 根据携带数据类型的不同，有不同的处理方式：

- Task messages

  如果携带的是 Runnbale 对象，那等轮到该条消息分发的时候，则该 Runnable 对象的 run 方法会直接得到执行，而不会再触发 `Handler.handMessage()` 方法。

- Data messages

  如果消息携带的是数据的话，那处理消息则需要重写 `Handler.handMessage()` 方法（两种方式）。

一种是正常的实现自己的 Handler ，然后重写该方法；或者在初始化 Handler 的时候直接重写该方法，但需要注意的是，如果在子线程中，该方法的重写要在消息队列就绪以后立刻声明，否则 loop() 循环开启后，就无法再声明了：

```java
class ConsumerThread extends Thread{
    Handler mHandler;
    @Override
    public void run(){
        Looper.prepare();
        mHandler = new Handler(){
            public void handleMessage(Message msg){
                // process data message here
            }
        };
        Looper.loop();
    }
}
```

另一种方式是利用 `Handler.Callback` 接口，该接口方法为一个带布尔类型返回值的 `handleMessage` 方法：

```java
public interface Callback {
    // true: 代表实现类处理完消息即终止
    // false: 代表实现类处理完以后，还要继续下发到 Handler.handleMessage 方法
	public boolean handleMessage(Message msg);
}

// 消息分发
public void dispatchMessage(Message msg) {
	if (msg.callback != null) {
		handleCallback(msg);
	} else {
		if (mCallback != null) {
            // 如果返回 true ，则不会继续向下分发了
			if (mCallback.handleMessage(msg)) {
				return;
			}
		}
		handleMessage(msg);
	}	
}
```

使用这种方式，调用者不再需要继承自 Handler ，而只需要将 Callback 接口的实现类当做 Handler 构造器传入即可，然后该 Handler 就会回调到 handleMessage()：

```java
public class HandlerCallbackActivity extends Activity implements Handler.Callback {
    Handler mUiHandler;
    
    @Override
    public void onCreate(Bundle savedInstanceState){
        super.onCreate(savedInstanceState);
        mUiHandler = new Handler(this); // 直接通过构造器传入，即可通过此类处理消息
    }
    
    @Override
    public boolean handleMessage(Message msg){
        // process msg
        return true;
    }
}
```

#### 与 UI 线程通信

正如之前所说，UI 线程是唯一一个自带 Looper 的线程，其他线程可以向 UI 线程发送消息，但要注意避免耗时操作，因为 UI 线程是全局的，每个任务的时长都会对全局任务的执行产生影响。

有以下几种方式将消息转交到 UI 线程处理：

1. 为 Handler 指定 UI 线程的 Looper

   ```java
   Runnable task = new Runnable(){...};
   new Handler(Looper.getMainLooper()).post(task);
   ```

   使用这种方式，不管调用线程，task 都会通过 UI Looper 直接插入 UI MessageQueue。

2. 直接在 UI 线程向自身发送消息，该任务会在当前正在执行的消息处理完后得到执行

   ```java
   private void postFromUiThreadToUiThread(){
       new Handler().post(new Runnable(){...})
   }
   ```

3. Activity.runOnUiThread

   ```java
   private void postFromUiThreadToUiThread(){
       runOnUiThread(new Runnable(){...})
   }
   ```

   如果此方法在其他线程调用，则它会将消息插入到 UI 线程的消息队列中。此方法只能由 Activity 的实例来调用，但是也可以实现自己的 runOnUIThread 方法，只要追踪 UI 线程的 ID 即可：

   ```java
   public class MyApplication extends Application{
       private long mUiThreadId;
       private Handler mUiHandler;
       
       @Override
       public void onCreate(){
           super.onCreate();
           mUiThread = Thread.currentThread().getId();
           mUiHandler = new Handler();
       }
       
       public void customRunOnUiThread(Runnable action){
           if(Thread.currentThread().getId() != mUiThreadId){
               mUiHandler.post(action);
           } else{
               action.run();
           }
       }
   }
   ```

   ​