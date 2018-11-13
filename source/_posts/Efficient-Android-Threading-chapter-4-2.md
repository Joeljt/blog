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

