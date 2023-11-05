---
thumbnail: https://raw.githubusercontent.com/Joeljt/BlogImage/master/20190415172255.jpg
title: Message 入队过程分析
tags: [Android]
date: 2019-10-26
---



熟悉 Handler 的应该都知道 MessageQueue，也就是消息队列的存在。



<!-- more -->



Handler 通过 sendMessageAtTime 方法发送消息，实质上就是通过 MessageQueue 对消息进行了一个入队的操作。那我们也知道，消息队列只是名为队列，实际的数据结构是以 Message 的 when 属性排序的链表，但是大部分时候我们都是在网上一些博客文章中了解到的，并没有实际的梳理过源码。今天我们就来看一下 Message 的实际入队流程，以及为什么消息队列要采用链表的方式实现。



### 源码 show time

前面也说了，入队操作是通过 MessageQueue#enqueueMessage 方法实现的，所以我们今天的重点就是来捋一下这个方法

```java
Message mMessages;
boolean enqueueMessage(Message msg, long when) {
    msg.when = when; 
    Message p = mMessages;
    if (p == null || when == 0 || when < p.when) {
        msg.next = p;
        mMessages = msg;
    } else {
        Message prev;
        for (; ;) {
            prev = p;
            p = p.next;
            if (p == null || when < p.when) {
                break;
            }
        }
        msg.next = p;
        prev.next = msg;
    }
    return true;
}
```

没错，这个方法只有这么几行代码，我们来看一下。

1. 入参时候的 when 参数，就是我们平时调用 sendMessageDelayed 方法时传入的延时 + 当前系统时间，**为了方便起见，我们在后边的分析中只取延时，忽略系统时间**
2. 入队之前，先将当前消息的发送时间赋值给当前消息的 when 属性，即 msg.when = when
3. 使用局部变量 p 来记录当前的消息，默认值为 null，然后开始逻辑判断



### 消息入队逻辑推演

我们在主线程发送几个消息如下：

```java
mHandler.sendEmptyMessage(100)；
mHandler.sendEmptyMessageDelayed(200, 1000)；
mHandler.sendEmptyMessageDelayed(300, 500)；
```

现在我们梳理一下这三条消息入队的顺序。

1. 第一条消息进入 enqueueMessage 方法，when = 0

   ```java
   if (p == null || when == 0 || when < p.when){}
   ```

   p == null 判断成立，因为 mMessages 默认值为 null；然后将 p 赋值给第一条消息的 next 属性（标准的单链表结构，利用 next 属性相连），然后将第一条消息赋值给全局的 mMessages 对象

2. 第二条消息进入 enqueueMessage 方法，when = 1000

   ```java
   Message p = mMessages;
   ```

   现在 mMessages 对象是有值的，是第一条消息对象，mMessages.next = null，mMessages.when = 0。

   那么我们来看 if 判断条件：

   - p == null，不成立，当前 p 是 mMessages 对象，即第一条消息对象
   - when == 0，不成立，第二条消息的 when 应该是 1000
   - when < p.when，即 1000 < 0，不成立

   三个条件都不能满足，那就来到 else 分支，我们继续一点点梳理：

   ```java
   Message prev;
   for (; ;) {
       prev = p;
       p = p.next;
       if (p == null || when < p.when) {
         break;
       }
   }
   msg.next = p;
   prev.next = msg;
   ```

   - 先声明一个 Message 对象 prev，用来标记前一条消息，即 previous message，然后开启一个死循环
   - 在循环中，将当前的消息对象 p 赋值给 prev 变量，然后取 p 的下一个节点，赋值给 p，此时判断 p == null 是成立的，因为之前 p.next = null，现在 p = p.next，所以 p == null 也是成立的，跳出循环
   - 跳出循环时，prev 是 mMessages 对象，即第一条插入的数据，p 是 mMessages.next，是 null
   - 然后将待插入消息的 next 属性设为 p，即 null，然后将待插入消息赋值给 prev.next，即 mMessages.next，就将先后两条消息连接起来了

   到现在为止，MessageQueue 的样子应该是：

   ```java
   mMessages = {Message(when = 0, next = {Message(when = 1000, next = null)})}
   ```
   
3. 第三条消息进入 enqueueMessage 方法，when = 500
  
  ```java
  Message p = mMessages;
  ```
  
  同样的，mMessages 不为空，指向首条插入的 Message 对象，when = 0，next 不为空，而传入的 when = 500，很明显 if 条件不能被满足：
  
  ```java
  if (p == null || when == 0 || when < p.when){}
  
  // p 不为空，传入的 when = 500，而 p.when = 0，所以 if 条件不能成立
  ```
  
  然后进入 else  分支：
  
  ```java
  Message prev;
  for (; ;) {
      prev = p;
      p = p.next;
      if (p == null || when < p.when) {
        break;
      }
  }
  msg.next = p;
  prev.next = msg;
  ```
  
  依然是开启死循环，从 mMessages 开始依次向后遍历，但是与第二次插入不同的是，当遍历到第二条消息对象时，即 prev = 首条消息，p = p.next(第二条消息) 时：
  
  - p == null 不成立
  - when (500) < p.when (1000) 成立，跳出循环
  - 跳出循环时，prev = 首条消息，p = 第二条消息
  
  然后将待插入消息的 next 指向 p，即原本的第二条消息，将 prev 的 next 指向待插入消息，即将第三条消息插到了原本的第一条和第二条消息中间，到此为止也就完成了消息的插入。



### 总结

当我们顺着代码逻辑，完整地走过这几次消息入队后，也就很清楚的看到 MessageQueue 的链表本质了。

概括地来说，MessageQueue 只持有一个 mMessages 的消息对象，然后利用 Message 的 next 属性进行多个消息之间的链接，同时使用 when 属性对消息进行排序，when 的值越小，在链表中的排序越靠前。

以我们上边的推演为例，MessageQueue 最后的形式应该是：

```java
mMessages = {
  Message(when = 0, next = {
    Message(when = 500, next = {
      Message(when = 1000, next = null)
    })
  })
}
```



#### 那么为什么 MessageQueue 要使用链表的形式来存储呢？

其实我们出去面试经常会被问到类似的问题，本质山这个问题就是：数组和链表的区别在哪里？

数组的优势在于使用角标查找方便，时间复杂度为 O(1)，但是插入的时候就会很费劲，要把整个数组依次向前向后移动来为新插入的数据腾出空间，时间复杂度可能为 O(n)；相反的，链表的优势却恰恰在于插入。

如果你看完了上面的文章，你会发现我们使用链表插入数据的时候，只需要将原本的 next 指针换一个指向，再将新数据的 next 指向原数据的 指向就可以完成插入，整个时间复杂度也是 O(1) 级别的；但是我们在找目标位置的时候就太痛苦了，需要一个死循环来从头开始遍历 Message 的 next 对象，知道找到目标对象才能完成插入，如果就是要插入到最后一个位置，那整个时间复杂度也是 O(n) 级别的。

而 Handler 的使用场景正是频繁插入，但是每次都只取最前面的消息处理，所以对于这种情况，天然的应该使用链表来进行存储而不是数组。

