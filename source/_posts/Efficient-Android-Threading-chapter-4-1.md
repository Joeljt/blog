---
thumbnail: https://raw.githubusercontent.com/Joeljt/BlogImage/master/20190321181341.jpg
title: 线程间通信 上篇
tags: [读书笔记, Efficient.Android.Threading]
date: 2018-09-09
---

> Efficient.Android.Threading 第四章读书笔记 上篇

<!--more-->

在多进程应用中，各个任务可以并行执行协作以产出结果。因此，各个线程之间必须进行通信才能满足协作执行的目的。在 Android 系统中，可以使用传统的 Java 线程通信技术，也可以使用 Android 专属的 Handler / Looper 消息机制。基于此，本章的主要内容为：

- 使用单向传输的管道来进行数据传输
- 共享内存通信
- 使用 `BlockingQueue` 实现生产者消费者
- 消息队列的具体操作
- 将具体任务发回 UI 线程

### 管道

管道 `Pipes` 从属于 `java.io` 包，也就是说，严格意义上讲，它是属于 Java 语言范畴，而非 Android 系统的。一个管道为同一进程的两个线程提供一种交互方式，为二者建立连接，搭建一个单向传输的数据传输通道：生产者线程向管道中写入数据，同时消费者线程从中取数据。

Java 管道与 Unix 系统管道命令 `|` 相比较起来有所不同。Java 管道用来为同一进程中的不同线程提供通信服务；而 Unix 系统管道命令用来将某个命令的输入重定向为另一命令的输入。

管道在内存中表现为一个循环缓冲区，仅适用于两个连接的线程，其他线程无法接触到其中的数据。同时，管道是单向的，只允许一个线程线程写入数据，另一线程读取数据，在这种情况下，线程安全是可以确定的。

![Pipes](https://raw.githubusercontent.com/Joeljt/BlogImage/master/20190321182548.jpg)

管道的典型使用场景为，并行的两个耗时任务，其中一个线程需要不停地给另一个线程传输数据。管道可以用来为 UI 线程减压，从而保证用户界面响应的及时性，从而提升用户体验。

管道可以传输二进制数据或者字节数据。其中，二进制数据的代表为 `PipedOutputStream` 和 `PipedInputStream` ，字节数据的代表为 `PipedWriter` 和 `PipedReader` 。除了传输数据类型的不同以外，以上两种类型的管道没有任何不同。管道的生命周期自两个线程建立连接开始，断开连接时生命周期结束。

#### 管道的基本使用

基本的管道生命周期可以归纳概括为三个步骤：建立连接，数据传输和断开连接。

```java
// 1.建立连接 - 
int BUFFER_SIZE_IN_CHARS = 1024 * 4; // 默认为 1024，可以自定义
PipedReader r = new PipedReader(BUFFER_SIZE_IN_CHARS);
PipedWriter w = new PipedWriter();
w.connect(r); // r.connect(w);

// 2.将消费者传入线程中, 线程启动后，就准备好从管道中读取数据了
Thread t = new MyReaderThread(r);
t.start();

// 3. 传输数据
// 类似这种生产者-消费者模型的通信方式，一般都是带有阻塞机制的。
// 如果管道已满，则 write() 会处于阻塞状态，直到管道中再次有空余空间；
// 如果缓存为空，则 read() 会处于阻塞状态。
// flush() 方法的调用是很有必要的
// 因为当 read() 线程调用 wait() 后，默认会有至少一秒钟的超时时长
// flush() 方法相当于 notify()，可以保证消费者马上对新加入的数据做出响应
w.write('A');
w.flush();

int i; // 传输的数据会被转为 int 类型，以保证不同编码格式的统一性
while((i = r.read()) != -1){
    char c = (char)i;
}

// 4. 关闭连接
// 如果关闭 writer, 管道关闭但缓存中的数据还会被读取到
// 如果关闭 reader, 则缓存中的数据会被清除
w.close();
r.close();
```

#### 管道在 Android 系统中的应用

使用管道来对用户输入进行一些简单处理：用户通过 EditText 输入内容，为了保证 UI 线程的即时性，使用管道将用户输入内容发送到工作线程进行某些耗时操作的处理：

```java
private static class TextHandlerTask implements Runnable {
	private final PipedReader reader;
	private TextHandlerTask(PipedReader reader) {
    	this.reader = reader;
    }
    @Override
    public void run() {
        while (!Thread.currentThread().isInterrupted()) {
            int i;
            try {
                while ((i = reader.read()) != -1) {
                    char c = (char) i;
                    Log.e("Test", "char -> " + c);
                }
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
    }
}

private PipedReader r = new PipedReader();
private PipedWriter w = new PipedWriter();
w.connect(r);

etSearch.addTextChangedListener(new TextWatcher() {

    @Override
    public void onTextChanged(CharSequence s, int start, int before, int count) {
        if (count > before) { // 输入内容
            try {
                w.write(s.subSequence(before, count).toString());
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
    }
});

new Thread(new TextHandlerTask(r)).start();

```

### 共享内存

共享内存是一种通用的线程间通信的方式。应用程序的地址空间存储在堆中，所有线程都可以对其进行访问，即某个线程操作某个数据，该数据同时可以被其他线程所读取。

![不同线程利用共享内存进行通信](https://raw.githubusercontent.com/Joeljt/BlogImage/master/20190321182555.jpg)

如果某个线程将其数据存储为局部变量（本地变量），那么其他线程是无法对其进行访问的。只有将数据存储在共享内存中，才能够被其他线程访问到，从而完成不同线程间的协作。以下对象一般被认为是存储在共享内存中的：`实例变量`，`类变量`，`方法中声明的对象`。

对象的引用（指针）存储在线程的栈中，但是对象其本身（占用的内存）存储在共享内存中。不同方法之间如果想要互相操作对象，则需要将对象的引用进行传递才可以实现。`不同的线程通过定义实例属性以及类属性来实现通信和任务协作`。

#### 发送信号

由于线程数据安全问题的存在，不同的线程在操作同一数据时需要有阻塞机制，来保证同一时间只有一个线程对共享数据进行操作。Java 内置的唤醒机制就很好的解决了这一问题。

![Thread signal](https://raw.githubusercontent.com/Joeljt/BlogImage/master/20190321182553.jpg)

当某一线程除非满足某个条件，否则无法继续执行时，该线程可以调用 wait() / await() 方法。timeout 参数表示当前线程在下次执行前，需要等待多久。

当其他线程已经将状态更改，也就是现在正在等待的线程已经满足条件了，那么当前线程会通过调用 notify() / notifyAll() 来通知等待的线程；而收到消息的线程则可以继续向下执行。

需要注意的是，很可能并不是只有一个线程在等待，但是只能有一个线程进入同步代码块，也就是说，收到通知消息的消息也并不一定可以继续向下执行。这就要求等待线程需要遵循一定的设计模式，即`在同步代码块中，重复检查条件是否已经满足`。

```java
synchronized(this){
    while(isConditionFulfilled == false){
		wait();
    }
    // 代码执行到这里时，才说明状态是对的
}
```

以上代码在同步代码块中再次检查了条件是否满足。如果不满足条件，则当前线程挂起等待；当收到通知消息，等待线程被唤醒，它在执行关键代码前会再次校验同步条件是否满足，因为有可能被其他线程捷足先登，如果不满足条件，则其会继续挂起，等待下一个唤醒信号。

以上机制很好的协同了多线程的通信，但是不适合 Android 平台，因为 UI 线程绝不能挂起等待工作线程完成任务后唤醒，之后的文章中介绍 Android 消息分发机制。

### 阻塞队列

线程信令是一种低级，高度可配置的机制，尽管它可以应用在很多场景，但同时这也是一种极容易出错的技术。因此，Java 平台基于线程信令机制，重新构建了一套抽象概念，以期解决线程之间多对象的单向切换。

在这一机制中，线程的挂起和唤醒不再通过消费者和生产者本身来控制，而是通过一个带有阻塞特性的队列来完成，例如，`java.util.concurrent.BlockingQueue`。

![BlockingQueue](https://raw.githubusercontent.com/Joeljt/BlogImage/master/20190321182555.jpg)

阻塞队列扮演着生产者线程和消费者线程中间的协调者，内部维护一个实现了线程信令机制，可自定义大小的列表。具体使用的时候，如果队列中数据已满，则生产者线程 put() 方法会阻塞，直到消费者从队列中取出数据；如果队列为空，则消费者线程 take() 方法会阻塞，直到生产者向队列中插入数据。

```java
public class ConsumerProducer{
    private final int LIMIT = 10;
    private BlockingQueue<Integer> blockingQueue = 
        new LinkedBlockingQueue<Integer>(LIMIT);
    
    public void produce() throws InterruptedException{
        int value = 0;
        while(true){
            blockingQueue.put(value++);
        }
    }
    
    public void consume() throws InterruptedException{
        while(true){
            int value = blockingQueue.take();
        }
    }
    
}
```
以上是第四章前半部分内容，由于篇幅较长，准备分为两篇来记录。

接下来会介绍 Android 平台的消息分发机制，下篇再见，大家加油~