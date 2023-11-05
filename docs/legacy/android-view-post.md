---
thumbnail: https://raw.githubusercontent.com/Joeljt/BlogImage/master/20190321181407.jpg
title: Android View.post 浅析
tags: [Android]
date: 2018-08-14
---

> 研究这个问题的契机很偶然，本来是在研究 View 的测绘流程，结果不知道为什么，就莫名其妙钻到这个牛角尖里来了……

<!-- more -->

### 序

之前的文章里写到过，我们在 onCreate() 和 onResume() 方法中无法获取 View 的宽高信息，但在平时开发中，我们经常会用到 View#post 来进行 View 宽高信息的获取。

那么问题就来了，为什么 View#post 就可以获取到宽高信息？里边那个 run() 是在什么时候执行的？具体实现原理又是什么？

带着这些疑问，我最近研究了一下 View#post 的源码。本来以为挺简单的一个东西，但是没想到坑越挖越深，最过分的是，不同的版本源码还不相同，实现原理也有细微的差别。集中攻克了一个周末以后，感觉大概理解了，索性写下篇博客进行记录备忘。

文章大概分为以下几个方面：

- View#post 基本使用
- post() 执行过程以及源码分析
- post() 中 Runnable#run 执行的时机
- View#post 整体流程的简单总结
- Android 7.0 里 View#post 的变动以及原因
- 致谢

### View#post 基本使用

具体代码如下：

```java
@Override
protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    setContentView(R.layout.activity_main);
    View view = findViewById(R.id.test);
    view.post(new Runnable() {
        @Override
        public void run() {
            // 可以正常获取到 View 的宽高信息
            Log.e("Test", "view.post ---- > " + view.getHeight());
        }
    });
}
```

这里我们以 API 26 为例，来尝试解答一下这个问题。

实际上，Android 系统以 API 24 为界，之前之后的版本，对此处的实现有细微的差别，具体的改动以及原因在后文会一一给出分析。



### post() 执行过程以及源码分析

#### 1. View#post 入口
先来看 View#post 源码，重点注意注释：

```java
/**
 * Causes the Runnable to be added to the message queue.
 * The runnable will be run on the user interface thread.
 * 将 Runnable 添加到执行队列中，其最终会在 UI 线程中执行
 */
public boolean post(Runnable action) {
    // AttachInfo 是 View 的内部类，用来存储一些基本信息
    // 此处可以暂时认为 mAttachInfo 为 null
    final AttachInfo attachInfo = mAttachInfo;
    if (attachInfo != null) {
        // attachInfo 不为空时，转而使用其内部的 Handler 对象操作
        return attachInfo.mHandler.post(action);
    }

    // Postpone the runnable until we know on which thread it needs to run.
    // Assume that the runnable will be successfully placed after attach.
    // 在我们确定当前 Runnable 的目标运行线程之前，先将其推迟执行
    // 假设在 attach 完成之后，此 Runnable 对象会被成功的「placed」（暂且翻译成「放置」）
    // 好好理解一下这个注释，我们继续往下走
    getRunQueue().post(action);
    return true;
}
```

首先，明确一点：**Runnable 会在 UI 线程中执行**；

然后，我们来看一下这个看上去很重要的 **mAttachInfo** 是在哪里赋值的：

```java
void dispatchAttachedToWindow(AttachInfo info, int visibility) {
    mAttachInfo = info;
    // Transfer all pending runnables. 转移所有待办任务
    if (mRunQueue != null) {
        mRunQueue.executeActions(info.mHandler);
        mRunQueue = null;
    }
    // 回调方法
    onAttachedToWindow();
}
```

先不在意除了赋值以外的其他操作，我们继续追踪 dispatchAttachedToWindow 方法，发现其最初调用是在 ViewRootImpl#performTraversals 方法。好了，记住这个结论，我们先把它放在一旁。

接下来，我们来看一看这个 **getRunQueue().post()** 又做了什么：

```java
/**
 * 获取一个 RunQueue 对象，用来进行 post 操作
 * Returns the queue of runnable for this view.
 * 注释是：为当前 View 对象返回一个执行队列，记住这个「当前 View 对象」
 */
private HandlerActionQueue getRunQueue() {
    if (mRunQueue == null) {
        mRunQueue = new HandlerActionQueue();
    }
    return mRunQueue;
}
```



#### 2. HandlerActionQueue 又是个啥

很明显，执行 post 方法的是 HandlerActionQueue 对象，那这又是个什么东西：

```java
/**
 * Class used to enqueue pending work from Views when no Handler is attached.
 * 此类用于在当前 View 没有 Handler 依附的时候，将其待完成的任务入队
 */
public class HandlerActionQueue {
    private HandlerAction[] mActions;
    private int mCount;

    // 这个就是我们在外边调用的 post 方法，最终会调用到 postDelayed 方法
    public void post(Runnable action) {
        postDelayed(action, 0);
    }

    // 将传入的 Runnable 对象存入数组中，等待调用
    public void postDelayed(Runnable action, long delayMillis) {
        final HandlerAction handlerAction = new HandlerAction(action, delayMillis);

        synchronized (this) {
            if (mActions == null) {
                mActions = new HandlerAction[4];
            }
            mActions = GrowingArrayUtils.append(mActions, mCount, handlerAction);
            mCount++;
        }
    }

    // 这里才是真的执行方法
    public void executeActions(Handler handler) {
        synchronized (this) {
            final HandlerAction[] actions = mActions;
            for (int i = 0, count = mCount; i < count; i++) {
                final HandlerAction handlerAction = actions[i];
                handler.postDelayed(handlerAction.action, handlerAction.delay);
            }

            mActions = null;
            mCount = 0;
        }
    }
}
```

通过查看 HandlerActionQueue 的源码，我们发现了一个问题：不同于在 onCreate() 直接获取 View 的宽高，我们调用 post 方法，其中的 run 方法并没有被马上执行。

这样就不难解释为什么用这种方式可以获取到宽高了。那我们可以猜测一下，这种情况下，一定是 View 完成测量后才执行了这个方法，所以我们才可以拿到宽高信息。

事实上也正是这样的，那么这个方法到底是在什么时候执行的呢？很明显，HandlerActionQueue#executeActions 才是真正完成调用的方法，那这个方法又做了些什么工作呢？

**根据代码可知，该方法接收一个 Handler，然后使用这个 Handler 对当前队列中的所有 Runnable 进行处理，即 post 到该 Handler 的线程中，按照优先级对这些 Runnable 依次进行处理。**

**简单来说，就是传入的 Handler 决定着这些 Runnable 的执行线程。**

接下来，我们来追踪这个方法的调用情况。

![executeActions() 的调用情况](http://upload-images.jianshu.io/upload_images/5419805-e0cf86fbea081bc9.jpg?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

我们注意到，对于该方法出现了两次调用，一次在 View#dispatchAttachToWindow（就是我们最开始找到的那个方法），另一次是在 ViewRootImpl#performTraversals。

#### 3. 万恶之源 performTraversals()

很明显，所有的证据都指向了 performTraversals ，那么下面我们就来重点分析一下这个方法。

如果你了解过 View 的测绘流程，那你对这个方法一定不会陌生，因为这个方法就是 View 绘制流程的起点。

```java
private void performTraversals() {
    
    // 此处的 host 是根布局 DecorView，用递归的方式一层一层的调用 dispatchAttachedToWindow
    // mAttachInfo 是不是很眼熟，就是最开始 View#post 的第一层判断
    // 这个 mAttachInfo 在 ViewRootImpl 的构造器中初始化的，其持有 ViewRootImpl 的 Handler 对象
    host.dispatchAttachedToWindow(mAttachInfo, 0);
    getRunQueue().executeActions(mAttachInfo.mHandler);
    
    // 绘制流程就从这里开始
    performMeasure();
    performLayout();
    performDraw();
}
```

我们先从 dispatchAttachedToWindow 开始，我们之前已经看过这个方法的源码了：

```java
void dispatchAttachedToWindow(AttachInfo info, int visibility) {
    mAttachInfo = info;
    // Transfer all pending runnables. 转移所有待办任务
    if (mRunQueue != null) {
        mRunQueue.executeActions(info.mHandler);
        mRunQueue = null;
    }
    // 回调方法
    onAttachedToWindow();
}
```
**现在来进行分析：**

1. 我们已经知道了此方法是从根视图开始递归向下调用的，那么递归到最深处，就会轮到最开始我们调用 post 方法的 View 对象来执行该方法，也就是该方法内的所有属性，都是我们 findViewById 获得的那个 View 对象的属性；
2. 而且我们也知道，第一个参数 AttachInfo 就是 ViewRootImpl 中初始化的 AttachInfo，它持有当前 ViewRootImpl 的 Handler 对象引用，并将该引用传给了 executeActions()。此时，我们再来回顾一下 **executeActions()** 方法的作用，**传入的 Handler 决定着队列里这些 Runnable 的执行线程**。


很明显，此处的 mRunQueue 就是我们最开始调用 post() 时，调用 View#getRunQueue 返回的那个对象，这个对象中有准备获取View高度的 Runnable 对象，也就是说 **mRunQueue 通过调用 executeActions() 将当前 View 的所有 Runnable ，都会转由 ViewRootImpl 的 Handler 来处理！**而在完成这个工作之后，当前 View 也显示地将 mRunQueue 置空，因为所有的待办任务都已经交给 ViewRootImpl 去处理了。

现在再回过头看代码的注释，就差不多可以理解了：

```java
// Postpone the runnable until we know on which thread it needs to run.
// Assume that the runnable will be successfully placed after attach.
// 所有的 Runnable 都会在 attach 之后被正确的放到其应该运行的线程上去
getRunQueue().post(action);

// Transfer all pending runnables.
// 转移所有待办任务(到 ViewRootImpl 中进行处理)
if (mRunQueue != null) {
    mRunQueue.executeActions(info.mHandler);
    mRunQueue = null;
}
```

dispatch 方法执行完了，我们继续回来走 performTraversals() ，接下来一句是：

```java
// 有之前的经验，我们知道这句话的意思是
// 使用 mAttachInfo.mHandler 来处理 getRunQueue() 中的 Runnable 任务
getRunQueue().executeActions(mAttachInfo.mHandler);
```

要明确的一点是，此时我们处在 ViewRootImpl 类中，此处的 getRunQueue() 方法有别于 View#post：

```java
// ViewRootImpl#getRunQueue
// 使用 ThreadLocal 来存储每个线程自身的执行队列 HandlerActionQueue
static HandlerActionQueue getRunQueue() {
    // sRunQueues 是 ThreadLocal<HandlerActionQueue> 对象
    HandlerActionQueue rq = sRunQueues.get();
    if (rq != null) {
        return rq;
    }
    rq = new HandlerActionQueue();
    sRunQueues.set(rq);
    return rq;
}

// View#post
// 为当前 View 返回一个执行队列，但是在 dispatchAttachToWindow 时转到 UI 线程去
private HandlerActionQueue getRunQueue() {
    if (mRunQueue == null) {
        mRunQueue = new HandlerActionQueue();
    }
    return mRunQueue;
}
```

说回 performTraversals() ，很明显 getRunQueue() 是 UI 线程执行队列的第一次初始化，也就是说当前这个任务队列里并没有待执行任务！

但是需要注意的是，**当前没有执行任务（**HandlerActionQueue**），不代表 Handler 消息队列中没有消息**，这是两个概念，需要注意区分开。

总结一下：

1. View#post 方法调用时，会为当前 View 对象初始化一个 HandlerActionQueue ，并将 Runnable 入队存储；
2. 等在 ViewRootImpl#performTraversals 中递归调用到 View#dispatchAttachedToWindow 时，会将 ViewRootImpl 的 Handler 对象传下来，然后通过这个 Handler 将最初的 Runnable 发送到 UI 线程（消息队列中）等待执行，并将 View 的 HandlerActionQueue 对象置空，方便回收；
3. ViewRootImpl#performTraversals 继续执行，才会为 UI 线程首次初始化 HandlerActionQueue 对象，并通过 ThreadLocal 进行存储，方便之后的复用，但需要注意的是，此处初始化的队列中是没有任何 Runnable 对象的；
4. 然后 ViewRootImpl#performTraversals 继续执行，开始 View 的测量流程。



### View#post 中 Runnable#run 执行的时机

但现在的问题是，无论怎么说，**HandlerActionQueue#executeActions 都是先于 View 测绘流程的**，为什么在还没有完成测量的时候，就可以拿到宽高信息？

我们都知道，Android 系统是基于消息机制运行的，所有的事件、行为，都是基于 Handler 消息机制在运行的。所以，当 ViewRootImpl#performTraversals 在执行的时候，也一定是基于某个消息的。而且，HandlerActionQueue#executeActions 执行的时候，也只是通过 Handler 将 Runnable post 到了 UI 线程等待执行（还记得 View#post 的注释吗？）。

不出意外的话，此时 UI 线程正忙着执行 ViewRootImpl#performTraversal ，等该方法执行完毕，View 已经完成了测量流程，此时再去执行 Runnable#run ，也就自然可以获取到 View 的宽高信息了。

下面用具体的实例佐证一下我们的猜想。

```JAVA
@Override
protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    setContentView(R.layout.activity_main);

    final ViewGroup viewGroup = (ViewGroup) getWindow().getDecorView();

    // 等待 Add 到父布局中
    view = new View(this) {
        @Override
        protected void onLayout( ... ... ) {
            super.onLayout(changed, left, top, right, bottom);
            Log.e("Test", "执行了onLayout()");
        }
    };

    // 自己声明的 Handler 
    mHandler.post(new Runnable() {
        @Override
        public void run() {
            Log.e("Test", "mHandler.post ---- > " + view.getHeight());
        }
    });

    // onCreate() 中 mAttachInfo 还未被赋值，这里会交给 ViewRootImpl 的 Handler 来处理
    // 即加入消息队列，等待执行
    view.post(new Runnable() {
        @Override
        public void run() {
            Log.e("Test", "view.post ---- > " + view.getHeight());
        }
    });

    viewGroup.addView(view);
}
```

最终打印日志如下：

![image](http://upload-images.jianshu.io/upload_images/5419805-ec13fe6929791de9.jpg?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

也就是说：

1. Handler#post 首先执行，其 post 的时间点在 onCreate() 方法内，在消息队列中的位置一定比 performTraversals() 靠前；
2. ViewRootImpl#performTraversal 执行，过程中执行了 View#dispatchAttachedToWindow 方法，将最初的 Runnable 入队后进行测量流程，完成了 layout 过程；
3. 之后才执行了最初的 View#post 方法，也就说明了，在 View#dispatchAttachedToWindow 中使用 ViewRootImpl 的 Handler postDelay 的 Runnable 对象，在主线程消息队列中，确实是排在 ViewRootImpl#performTraversal 之后的

### View#post 整体流程的简单总结

最后大概总结一下：

当我们使用 View#post 时，会有两种情况：

1. 在当前 View attach 到 Window 之前，会自己先维护一个 HandlerActionQueue 对象，用来存储当前的 Runnable 对象，然后等到 Attach 到 Window 的时候 (也就是 ViewRootImpl 执行到 performTraversal 方法时) ，会统一将 Runnable 转交给 ViewRootImpl 处理；
2. 而在 View#dispatchAttachedToWindow 时，也会为当前 View 初始化一个 AttachInfo 对象，该对象持有 ViewRootImpl 的引用，当 View 有此对象后，后续的所有 Runnable 都将直接交给 ViewRootImpl 处理；
3. 而 ViewRootImpl 也会在执行 performTraversal 方法，也会调用 ViewRootImpl#getRunQueue ，利用 ThreadLocal 来为主线程维护一个 HandlerActionQueue 对象，至此，ViewRootImpl 内部都将使用该队列来进行 Runnable 任务的短期维护；
4. 但需要注意的是，各个 View 调用的 post 方法，仍然是由各自的 HandlerActionQueue 对象来入队任务的，然后在 View#dispatchAttachedToWindow 的时候转移给 ViewRootImpl 去处理。



### Android 7.0 里 View#post 的变动以及原因

View#post 说到这里大概就差不多了，文章开篇的时候说到：

> Android 系统以 API 24 为界，之前之后的版本，对此处的实现有细微的差别

下面来简单对比一下具体的差别，顺便分析一下具体为什么要这样改动。

实际上这个方法的改动主要是为了解决一个 bug，这个 bug 就是：**在 View 被 attach 到 window 之前，从子线程调用的 View#post ，永远无法得到执行。**

具体原因，我们来看一下 API23 版本的 View#post，就大概都明白了：

```java
// Android API23 View#post
public boolean post(Runnable action) {
    final AttachInfo attachInfo = mAttachInfo;
    if (attachInfo != null) {
        return attachInfo.mHandler.post(action);
    }
    // Assume that post will succeed later
    // 注意此处，不同于我们之前介绍的，这里是直接使用 ViewRootImpl#getRunQueue 来入队任务的
    ViewRootImpl.getRunQueue().post(action);
    return true;
}
```

我们可以看到，不同于我们之前介绍的，API23 版本中，View#post 在没有 attach 到 window 之前，也就是 mAttachInfo 是 null 的时候，不是自己维护任务队列，而是直接使用 ViewRootImpl#getRunQueue 来入队任务的。

再来看一下 ViewRootImpl#getRunQueue 方法，我们就会发现问题出在哪里了：

```java
static final ThreadLocal<RunQueue> sRunQueues = new ThreadLocal<RunQueue>();
static RunQueue getRunQueue() {
    RunQueue rq = sRunQueues.get();
    if (rq != null) {
        return rq;
    }
    rq = new RunQueue();
    sRunQueues.set(rq);
    return rq;
}
```

没错，这个队列的保存与获取，是通过以线程为 key 值来存取对象 ThreadLocal 来维护的。而在这个版本的源码中，executeActions() 方法的执行，只有一次调用，那就是 ViewRootImpl#performTraversal 中（感兴趣的可以去 23 版本的源码中查看，这里就不贴图了），与此同时，该方法肯定是执行在主线程中的。

现在的问题就变成了：**我在子线程中 post 了一个 runnable，并且系统以该子线程为 key 将队列存了起来等待执行；但是在具体执行的时候，系统却是去主线程中寻找待执行的 Runnable，那么当然是永远都得不到执行的了。**

而在**具体 attach 到 window 之后**，View 的 mAttachInfo 持有 ViewRootImpl 引用，会直接将所有的 Runnable 转交给 ViewRootImpl 的 Handler 处理，也**就都能得到妥善处理，就与线程无关了。**

除此以外，ViewRootImpl 使用 ThreadLocal 来存储队列信息，在某些情境下，还会导致内存泄漏。详细信息可以参考：https://blog.csdn.net/a740169405/article/details/69668957

所以，**Google 工程师为了解决这两个问题（内存泄漏的问题更严重一些），就在 View#post 方法中使用 View 对象来进行队列的存储，然后在 attach 到 window 的时候，通过持有 ViewRootImpl 引用的 AttachInfo 对象直接将 View 对象的 Runnable 处理掉，就完美解决了这些问题。**



### 致谢

下边是自己研究的时候具体参考过的文章，给各位前辈加个鸡腿：

##### https://blog.csdn.net/a740169405/article/details/69668957

##### https://blog.csdn.net/scnuxisan225/article/details/49815269

##### https://www.cnblogs.com/plokmju/p/7481727.html

