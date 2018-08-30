---
thumbnail: http://p5zd0id9p.bkt.clouddn.com/18-8-30/54395897.jpg
title: Java 中的多线程
tags: [读书笔记, Efficient.Android.Threading]
date: 2018-08-25
---

> Efficient.Android.Threading 第二章读书笔记

<!--more-->

所有 Android 应用都应该进行多线程编程，因为其可以大幅度的提高应用的性能以及响应效果；但是也会由此带来一系列的问题，导致编码的过程更加复杂。

- 处理 Java 并发
- 在多个线程中保证共享数据的稳定性
- 定制以及优化不同线程的执行策略

### 线程基础

线程 `thread` 是 CPU 最小调度单元，一般来讲，一个应用中的任务会按代码顺序来执行。线程中待执行的代码被称作任务 `task`。一个线程可以只执行一个任务，也可以按顺序执行多个任务。

#### 线程的执行

Android 应用中的常用线程即 `java.lang.Thread`，线程生命周期的长度取决于执行任务的大小以及耗时。

线程支持执行实现了 `java.lang.Runnable` 接口的任务，具体的任务是实现在 `run` 方法中的，具体如下：

```java
private class MyTask implements Runnable { 
    public void run() {
        // 在 run 方法中直接或间接调用到的所有局部变量，都将存储在该线程本地内存堆栈中
		int i = 0; 
    }
}
```

通过实例化和启动 Thread 对象，来启动任务的执行：

```java
Thread thread = new Thread(new MyTask());
thread.start();
```

从操作系统层面来说，线程同时具有指令和堆栈指针。指令指针引用要处理的下一条指令，堆栈指针指向一个私有内存区域（对其他线程不可见），该区域用于存储当前线程的数据。当前线程的数据 `thread local data` 一般指的是在 Java 方法中定义的变量信息。

一般来讲，系统都希望能将 CPU 最大限度的利用起来，但矛盾的地方在于，同一 CPU 在同一时间只能运行一个线程。在这种情况下，为了让用户感知不同的程序正在同时运行，就必须让 CPU 忙起来，在不同的线程之间来回切换，进行任务的执行，这个过程被称为线程的调度` scheduler`。在 Java 中，线程调度的基准是线程的优先级 `priority` ，优先级默认为 5，范围为 1-8 。

但是，如果线程的调度是完全基于优先级的话，就有可能导致低优先级的线程任务永远得不到执行，也就是所谓的饥饿致死。为解决这个问题，Java 调度器在执行线程调度时，还会将线程的执行时间列入考虑的范围。

每次不同线程的切换被称为上下文切换 `context switch` 。每次进行上下文切换时，CPU 会先将当前正在执行的线程状态进行保存，以方便下一次恢复当前线程的执行；其后暂停当前线程，同时恢复另一线程的执行。

具体的线程调度可以通过下图进行理解，图中的 C 就是上下文切换的过程。

![线程调度示例](http://p5zd0id9p.bkt.clouddn.com/18-8-23/75211234.jpg)

#### 单线程应用

每个应用至少会有一个线程，也就是我们所熟知的主线程，默认情况下，编写的代码都将在这个线程中进行执行。

单线程编程是最简单的编码方式，但是很多情况下这种方式并不能满足我们的需求，因此，我们就需要将代码分别运行在不同的线程中，从而保证代码执行的高效性以及程序的性能。

#### 多线程应用

如果执行线程的数量超过处理器数量，则无法实现真正的并发，但调度程序在要处理的线程之间快速切换，以便将每个代码路径拆分为按顺序处理的执行间隔。尽管多线程编程会极大的提高应用的性能，但是这是有一定代价的。具体表现为：复杂性的提高，内存开销的增加，不确定的执行顺序等。

##### 复杂性提高，不确定的执行顺序

分析单线程应用程序的执行相对简单，因为执行顺序是已知的。在多线程应用程序中，分析程序如何执行以及代码以何种顺序处理要困难得多。执行顺序在线程之间是不确定的，因为调度器将如何分配执行时间给线程是未知的。因此，多线程的执行过程是不确定的。这种不确定性不仅使代码中的错误调试变得更加困难，而且协调线程的过程中也有很大可能会引入新的错误。

##### 资源开销的增加

线程在内存和处理器使用方面具有开销。之前提到过，每个线程都会申请一块私有内存区域，用来存储线程数据。这片私有内存在线程创建之初就会申请出来备用，直到线程终止才会被回收并重新分配。在这个过程中，只要当前线程是存活的，即便它是闲置或是阻塞状态，也会持续占用系统资源。

处理器的开销主要来自于初始化、回收线程，以及在上下文切换中存储和恢复线程。执行的线程越多，上下文切换就越多，性能就越差。

##### 数据不一致

多线程程序对资源的访问还会产生一个新的问题，就是数据的共享。如果两个或更多线程同时操作某一个数据，则我们无法确定哪个线程正在对这个数据进行什么样的操作，这就导致了最后数据的不可靠性。

因为上下文切换可能发生在一个线程中不应中断的位置(比如正在对某个关键性数据进行操作时），所以必须创建代码指令的原子区域 `atomic region`。如果线程在原子区域中执行，则其他线程将被阻塞，直到在原子区域中没有其他线程执行。因此，Java中的原子区被认为是互斥的，因为它只允许访问一个线程。

可以用不同的方式创建原子区域  `atomic region`，但是最基本的同步机制是 `synchronized` 关键字 ：

```java
synchronized (this) { 
    sharedResource++;
}
```

如果对共享资源的每次访问都是同步的，那么尽管多线程访问，数据也都将是一致的。



### 线程安全

在多线程应用中，共享资源有可能会被多方同时访问，同时读写，这就导致了数据的不可靠性。在这种情况下，需要通过使用锁定机制来实现同步。

Android 中的锁定机制主要包括两种：

- 对象内在锁定

  `synchronized` 关键字

- 显式锁

  `java.util.concurrent.locks.ReentrantLock`
  `java.util.concurrent.locks.ReentrantReadWriteLock`


#### 内在锁和Java监视器

`synchronized` 关键字适用于每个 Java 对象，其内部包含一个隐式可用的锁。内部锁是互斥的，这意味着同步关键字的代码区域（临界区）中的线程执行是某一个线程独占的。当临界区被占用时，其他线程则会处于阻塞状态，在同步锁释放前，该线程代码无法继续正常执行。

内在锁充当一个监视器的角色，该监视器有三种状态：

1. 阻塞状态 `Blocked`

   当前线程要等待正在被其他线程占用的内在锁，从而处于挂起状态；

2. 运行状态 `Executing`

   当前线程唯一占据内部锁并且正在临界区内执行代码；

3. 等待状态 `Waiting`

   当前线程刚刚将临界区代码执行完毕，主动释放了锁；并等待下次获取内部锁；

![Java监视器示例](http://p5zd0id9p.bkt.clouddn.com/18-8-24/6478868.jpg)

一个完整的线程锁工作流大体如下：

1. `Enter the monitor`

   某个线程尝试去操作被同步锁锁住的的代码片段，此时该线程进入 Java 监视器中，如果当前同步锁被其他线程占用，则当前线程挂起；

2. `Acquire the lock`

   如果当前同步锁处于空闲状态，则阻塞状态的线程则可以获取锁，并进入同步代码块开始执行。如果有多个线程阻塞等待，则由调度器决定谁将获取锁，而并不是先来后到的；

3. `Release the lock and wait`

   满足某种条件后，持有锁对象的线程会主动调用锁对象的 `Object.wait()` 将锁资源释放，然后等待满足某种条件后，重新获取执行权；

4. `Acquire the lock after signal`

   如果某个等待状态的线程被调度器选择为下一个执行线程，则它会在其他线程调用 `Object.notify()` 或者 `Objecct.notifyAll()` 时，获得同步锁并进入同步代码块；需要注意的是，等待线程相比较于阻塞线程并没有绝对的优先权，因为二者都想执行这部分同步代码，也就是说最终的选择权在于调度器；

5. `Release the lock and exit the monitor`

   在代码执行完毕后，线程会退出监视器，让其他真正有需要的线程做操作。



具体的同步代码块示例：

```java
// (1) 
synchronized (this) { 
    // Execute code (2) 
    wait(); // (3)
	// Execute code (4)
} 
// (5)
```

#### 同步对共享资源的访问

在多线程应用中，共享资源可能被多方同时获取及修改，这种情况下就需要有一个有效的同步机制，来保证多线程下数据的统一性。这种机制具体包括同步锁类型的选择，以及同步代码块范围的设定。

##### 使用内部锁

`synchronized` 关键字有多种使用方式：

- 作用在方法上

  ```java
  synchronized void changeState() { 
      sharedResource++;
  }
  ```

- 同步代码块，使用当前类作为同步锁

  ```java
  void changeState() { 
      synchronized(this) {
      	sharedResource++;
      }
  }
  ```

- 同步代码块，使用其他对象作为同步锁

  ```java
  private final Object mLock = new Object();
  void changeState() { 
      synchronized(mLock) {
      	sharedResource++;
      } 
  }
  ```

- 作用于静态方法

  ```java
  synchronized static void changeState() { 
      staticSharedResource++;
  }
  ```

- 静态方法的同步代码块，使用当前类作为同步锁

  ```java
  static void changeState() { 
      synchronized(this.getClass()) {
      	staticSharedResource++;
      }
  }
  ```

使用 this 在代码块内作为同步锁，与直接在方法上加 `synchronized` 关键字是相同的。但是更建议使用同步代码块，因为不一定方法内的全部代码都需要保证同步，滥用同步有可能导致不必要的性能损耗。

值得注意的是，作用于静态方法的同步锁对象是当前 Class 类对象，而并非其实例对象。

##### 使用显式锁机制

`ReentrantLock` 和 `ReentrantReadWriteLock` 类可以用来替代 `synchronized` 关键字充当监视器。这种情况下，同步代码块的锁定和解锁都是由调用者手动调用的。

```java
// ReentrantLock 显式锁调用示例
int sharedResource;
private ReentrantLock mLock = new ReentrantLock();

public void changeState(){
    mLock.lock();
    try{
        sharedResource ++;
    }
    finally{
        mLock.unlock();
    }
}
```

`ReentrantLock` 和 `synchronized` 关键字语义相同，都会将同步代码块隔离开，保证只有一个线程能够对其进行操作。二者都是一种防御性策略，假设所有并发访问都存在问题，但多线程同时读取共享变量并不是有害的。因此，synchronized 和 ReentrantLock 可能存在过度保护。

`ReentrantReadWriteLock` 则允许多个线程对共享数据同时进行读取，但是仍然禁止同时读写或者同时写入。示例代码如下：

```java
// ReentrantReadWriteLock 显式锁调用示例
int sharedResource;
private ReentrantReadWriteLock mLock = new ReentrantReadWriteLock();

public void changeState() { 
    mLock.writeLock().lock(); 
    try {
        sharedResource++;
    }
    finally{
        mLock.unlock();
    }
}

public int readState(){
    mLock.readLock().lock();
    try{
        return sharedResource;
    }
    finally{
        mLock.readLock().unlock();
    }
}
```

`ReentrantReadWriteLock` 相对复杂，从而会对性能造成影响。因为相对于 `ReentrantLock` 和 `synchronized` 来讲，`ReentrantReadWriteLock` 要花费更多的时间去判断应不应该阻塞当前线程，这也相当于是让读取操作同步执行的一种妥协。实际上，`ReentrantReadWriteLock` 的典型应用应该是多个线程进行读取，但只有少量线程会进行写入操作。

#### 生产者消费者模型

生产者消费者是线程协作的经典模型，生产者线程和消费者线程共享一个列表，当该列表为空时，生产者线程向其中添加商品；如果列表不为空，则消费者线程会将商品移除。也就是说，当列表为空时，消费者线程应该阻塞等待；当列表已满时，生产者线程应该阻塞等待。

`ComsumerProducer` 类包括两个线程，一个生产者线程，一个消费者线程，二者共享一个 LinkedList 对象，分别对其进行增加和删除操作：

```java
public class ConsumerProducer{
    private LinkedList<Integer> list = new LinkedList<>();
    private final int LIMIT = 10;
    private Object lock = new Object();
    
    public void produce(){
        int value = 0;
        while(true){
            synchronized(lock){
                while(list.size() == LIMIT){
                    lock.wait();
                }
                list.add(value++);
				lock.notify();
            }
        }
    }
    
    public void consume(){
        int value = 0;
        while(true){
            synchronized(lock){
                while(list.size() == 0){
                    lock.wait();
                }
                list.removeFirst();
                lock.notify();
            }
        }
    } 
}
```

生产者线程和消费者线程共用同一把锁，来保证共享数据 list 的一致性。当列表为满时，生产者主动挂起等待；当列表为空时，消费者主动挂起等待。两个线程在挂起的同时，又会调用 `lock.notify()` 给正在等待的对方发送信号，通知其获取同步锁并执行代码，从而完成共享数据的同步。

```java
final ConsumerProducer cp = new ConsumerProducer();

// producer
new Thread(new Runnable(){
    @Override
    public void run(){
        cp.produce();
    }
}).start();

// consumer
new Thread(new Runnable(){
    @Override
    public void run(){
        cp.consume();
    }
}).start();
```



#### 任务执行策略

一般来讲，两种极端的执行策略如下：

1. 所有的任务都执行在同一线程上
2. 每一个任务都对应一个线程

很明显上述两种策略都过于极端：前者效率过低，后者大量的线程初始化和回收会造成大量的性能消耗。尽管如此，上述两种策略还是目前最常用的两种执行方式：

1. 顺序执行

   各个任务按照先后顺序进行执行，各任务的执行时间不会有重叠。这样做的优势是数据绝对安全，而且只有一个线程执行，占用内存会比多线程更少；缺点在于吞吐量过低，一个任务的执行与否取决于前一个任务能否成功完成；

2. 并发执行

   所有的任务都并行执行，最大化利用 CPU ，但是会带来数据的不安全性，需要进行同步机制规避。

一个出色的执行策略应该是顺序执行和并发执行并重的。相对独立的任务应该并发执行以提高效率，但是有相对严格执行顺序的任务则应该执行在单一线程中。

##### 并发执行设计原则

- 控制新线程的重复创建，而应该注意对已有线程的复用，从而降低创建、回收线程的频率
- 提高线程使用效率，多余的线程对于内存和处理器都是一种资源浪费



#### 总结

Android应用程序应该是多线程的，以提高单处理器和多处理器平台的性能。线程可以在单个处理器上顺序执行，或者在多个处理器可用时实现真正的并发。性能的提高是以增加复杂性为代价的，同样需要维护同步机制，以保证线程之间共享资源数据的一致性。

