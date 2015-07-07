/**
 * Session Monitor task, alerts the user that their session will expire in 60 seconds and provides
 * the options to continue working or logout.  If the count-down timer expires,  the user is automatically
 * logged out.
 */
Ext.define('MyApp.widgets.SessionMonitor', {
  singleton: true,					//单例程序	

  interval: 1000 * 10, 				// 运行时间间隔.
  lastActive: null,					// 最近活动时间
  maxInactive: 1000 * 60 * 0.15,  	// 15 分钟的非活动状态监视; 应该和服务器过期时间接近一致，测试时候设置为1.
  remaining: 0,						// 剩余时间
  ui: Ext.getBody(),
  
  /**
   * 显示过期提示信息，并且进行过期时间倒计时的对话框.
   */
  window: Ext.create('Ext.window.Window', {
    bodyPadding: 5,
    closable: false,
    closeAction: 'hide',
    modal: true,
    resizable: false,
    title: '登录退出提示',
    width: 325,
    items: [{
      xtype: 'container',
      frame: true,
      html: "登录界面接近15分钟没有任何操作，即将退出登录状态，退出登录状态之后，未保存信息将会丢失。</br></br>如果希望继续工作，请点击'继续'按钮。</br></br>"    
    },{
      xtype: 'label',
      text: ''
    }],
    buttons: [{
      text: '继续',
      handler: function() {
        Ext.TaskManager.stop(MyApp.widgets.SessionMonitor.countDownTask);
        MyApp.widgets.SessionMonitor.window.hide();	//窗体隐藏
        MyApp.widgets.SessionMonitor.start();		//开始监视界面操作状态

        // 访问服务器，更新会话状态
        Ext.Ajax.request({
          url: 'user/poke.action'					//访问更新的网址
        });
      }
    },{
      text: '登出',
      action: 'logout',
      handler: function() {
        Ext.TaskManager.stop(MyApp.widgets.SessionMonitor.countDownTask);	//停止倒计时
        MyApp.widgets.SessionMonitor.window.hide();							//窗体隐藏
        
        // 找到注销按钮，并且点击注销退出按钮
        Ext.ComponentQuery.query('button[action="buttonLogout"]')[0].fireEvent('click');
      }
    }]
  }),

 
  /**
   * 设置一个计时任务来监视鼠标和键盘的事件，将会出现一个60秒钟的倒计时任务对话框
   */
  constructor: function(config) {
    var me = this;
   
    // 定义操作状态监视任务
    this.sessionTask = {
      run: me.monitorUI,		//运行界面活动监视函数
      interval: me.interval,	//每隔10秒
      scope: me
    };

    // 60秒钟倒计时提示任务
    // 消息提示用户超时时间将要到期.
    this.countDownTask = {
      run: me.countDown,		//运行倒计时任务
      interval: 1000,			//每隔1秒
      scope: me
    };
  },
 
 
  /**
   * 监视鼠标移动及键盘按键时间.更新最近活动时间
   */
  captureActivity : function(eventObj, el, eventOptions) {
    this.lastActive = new Date();
  },


  /**
   *  监视界面 UI 比较当前时间和最后活动时间，决定是否启动退出倒计时
   */
  monitorUI : function() {
    var now = new Date();
    var inactive = (now - this.lastActive);
        
    if (inactive >= this.maxInactive) {
      this.stop();	//停止界面活动监视
	  
      this.window.show();	// 激活超时提示窗体
      this.remaining = 60;  // 设置剩余续时60秒
      Ext.TaskManager.start(this.countDownTask);	//开启倒计时任务
    }
  },

 
  /**
   * 启动 session 任务计时 并且监视鼠标的键盘的活动
   */
  start : function() {
    this.lastActive = new Date();	//记录当前时间为活动时间

	//定义监视页面
    this.ui = Ext.getBody();
	
	//如果监测到鼠标移动或者是键盘按键的时候更新最近活动时间
	
    this.ui.on('mousemove', this.captureActivity, this);
    this.ui.on('keydown', this.captureActivity, this);
	
    // 开启操作状态定时监视任务
    Ext.TaskManager.start(this.sessionTask);
  },
 
  /**
   * 停止 session 任务计时 不再监视鼠标和键盘的活动
   */
  stop: function() {
	  
	//停止界面监视任务
    Ext.TaskManager.stop(this.sessionTask);
	
	//停止监视鼠标和键盘活动
    this.ui.un('mousemove', this.captureActivity, this);
    this.ui.un('keydown', this.captureActivity, this);
  },
 
 
  /**
   * Countdown function updates the message label in the user dialog which displays
   * the seconds remaining prior to session expiration.  If the counter expires, you're logged out.
   */
  countDown: function() {
    this.window.down('label').update(this.remaining + ' 秒之后您将自动退出系统' );
    
    --this.remaining;

    if (this.remaining < 0) {
      this.window.down('button[action="logout"]').handler();
    }
  }
 
});