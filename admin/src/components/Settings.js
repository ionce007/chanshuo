import React, { Component } from 'react';
import { connect } from 'react-redux';
import axios from 'axios';
//import SparkMD5 from 'spark-md5';
import { message as Message, Button, Tabs, Form, Input, Upload, } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

const { TabPane } = Tabs;

const tabs = [
  {
    label: '通用设置',
    settings: [
      {
        key: 'domain',
        title: '域名',
        description: '请输入你的域名，例如：www.domain.com',
      },
      {
        key: 'language',
        title:'语言',
        description: '语言',
      },
      {
        key: 'copyright',
        title:'版权信息',
        description: '请输入 HTML 代码，其将被放置在页面的末尾',
      },
      {
        key: 'allow_comments',
        title:'允许评论',
        description: 'true 或者 false',
      },
      {
        key: 'allow_gratitude',
        title:'显示赞赏付款二维码',
        description: 'true 或者 false',
      },
      {
        key: 'use_cache',
        title:'使用缓存',
        description: 'true 或者 false',
      },
      {
        key: 'zhipu_auth',
        title:'智谱授权码',
        description: '智谱清言网站大模型AI访问的授权码',
      },
    ],
  },
  {
    label: '自定义设置',
    settings: [
      {
        key: 'theme',
        title:'网站主题',
        description: "博客主题，可选值：bulma, bootstrap, bootstrap5, v2ex, next 以及 w3",
      },
      {
        key: 'code_theme',
        title:'代码网格',
        description: '从这里选择一个代码主题：https://www.jsdelivr.com/package/npm/highlight.js?path=styles',
      },
      {
        key: 'site_name',
        title:'网站名称',
        description: "网站名称",
      },
      {
        key: 'description',
        title:'网站描述',
        description: '网站描述信息',
      },
      {
        key: 'site_key',
        title:'网站关键字',
        description: '网站关键字，用于网站SEO优化',
      },
      {
        key: 'nav_links',
        title:'网站菜单',
        description: '必须是合法的 JSON 格式的文本',
        isBlock: true,
      },
      {
        key: 'author',
        title:'作者名称',
        description: '你的名字',
      },
      {
        key: 'motto',
        title:'网站个性',
        description: '你的格言',
      },
      {
        key: 'favicon',
        title:'网站图标',
        description: '请输入一个图片链接',
      },
      {
        key: 'brand_image',
        title:'广告图片',
        description: '请输入一个图片链接',
      },
      {
        key: 'index_page_content',
        title:'自定义首页',
        description: '自定义首页 HTML 代码，输入 404 则对外隐藏首页',
        isBlock: true,
      }
    ],
  },
  {
    label: '其他设置',
    settings: [
      {
        key: 'ad',
        title:'广告代码',
        description: '广告代码',
        isBlock: true,
      },
      {
        key: 'extra_header_code',
        title:'统计代码',
        description: '此处代码会被插入到 header 标签内，可在此处放入统计代码',
        isBlock: true,
      },
      {
        key: 'extra_footer_code',
        title:'页尾代码',
        description: '此处代码会被插入到 footer 标签内',
      },
      {
        key: 'disqus',
        title:'评论标识',
        description: 'Disqus 标识符，未输入则无法启用评论',
      },
      {
        key: 'extra_footer_text',
        title:'页脚信息',
        description: '自定义页脚信息，支持 HTML，可在此放入备案信息等',
      },
      {
        key: 'message_push_api',
        title:'消息推送',
        description: '消息推送 API 链接，具体参见：https://github.com/ionce007/message-pusher',
      },
    ],
  },
];

class Settings extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      submitLoading: false,
      language: 'javascript',
      options: {},
      optionIndex: 0,
      backupText: '备份数据库',
      uploadText: '上传数据库',
    };
  }

  static getDerivedStateFromProps({ status }) {
    return { status };
  }

  async componentDidMount() {
    if (this.state.status === 0) {
      Message.error('访问被拒绝');
      this.props.history.push('/login');
      return;
    }
    await this.fetchData();
  }

  fetchData = async () => {
    try {
      this.setState({ loading: true });
      const res = await axios.get(`/api/option/`);
      let { status, message, options } = res.data;
      let temp = {};
      if (status) {
        options.forEach((option) => {
          temp[option.key] = option.value;
        });
        options = temp;
        console.log(options);
        this.setState({ options });
      } else {
        Message.error(message);
      }
      this.setState({ loading: false });
    } catch (e) {
      Message.error(e.message);
    }
  };

  updateOption = (key, value) => {
    let options = this.state.options;
    options[key] = value;
    this.setState({ options });
  };
  resetCache = async() => {
    const res = await axios.post(`/api/option/resetCache`);
  }
  backupDatabase = async () => {
    try {
      //let that = this;
      this.setState({ backupText: '正在下载...' })
      let dbFile = `/api/option/backupdb`;
      fetch(dbFile, { method: 'get' })
        .then(res => res.blob())
        .then(data => {
          this.fileDown(data)
          //this.setState({backupText: '备份数据库'})
        })
    }
    catch (err) {
      Message.error(err.message);
      this.setState({ backupText: '备份数据库' });
    }
  }
  fileDown = (data) => {
    const link = document.createElement('a')
    link.download = 'data.db';
    link.href = URL.createObjectURL(data)
    link.style.display = 'none'
    link.text = '文件下载'
    document.body.appendChild(link)
    link.click()
    URL.revokeObjectURL(link.href)
    document.body.removeChild(link);
    this.setState({ backupText: '备份数据库' });
  }
  handleFileChange = async (file) => {
    try {
      const source = file.files[0];
      upload(source);
    }
    catch (error) {
      Message.error(err.message);
      this.setState({ uploadText: '备份数据库' });
    }
  }
  upload = async (source) => {
    const blob = new Blob([source], { type: source.type })
    debugger;
    fetch('/api/option/uploaddb', { method: 'post', body: blob })
  }
  submit = async () => {
    let options = this.state.options;
    try {
      const res = await axios.put(`/api/option/`, options);
      const { status, message } = res.data;
      if (status) {
        Message.success('设置更新成功');
      } else {
        Message.error(message);
      }
      this.setState({ loading: false });
    } catch (e) {
      Message.error(e.message);
    } finally {
      this.setState({ submitLoading: false });
    }
  };
 

fileSelected = async (e) => {
  //const file = e.target.files[0];
}
uploadFile = async () => {
  const fileEl = document.getElementById("file");
  fileEl.click();
}
render() {
  const uploadProps = {
    name: 'file',
    multiple: true,
    //action: '/api/option/uploaddb',
    onChange(info) {
      const { status } = info.file;
      if (status === 'done') {
        Message.success(`文件上传成功：${info.file.name}`);
        that.fetchData().then((r) => { });
      } else if (status === 'error') {
        Message.error(`文件上传失败：${info.file.name}`);
      }
    },
  };

  return (
    <div className={'content-area'}>
      <h1>系统设置</h1>
      <div style={{ background: '#fff', padding: 16 }}>
        <Tabs tabPosition={'left'}>
          {tabs.map((tab) => {
            tab.settings.sort((a, b) => {
              if (a.key < b.key) {
                return -1;
              }
              if (a.key > b.key) {
                return 1;
              }
              return 0;
            });
            return (
              <TabPane tab={tab.label} key={tab.label}>
                <Form layout={'vertical'}>
                  {tab.settings.map((setting) => {
                    //setting.label = setting.key.replaceAll('_', ' ').toUpperCase();
                    setting.label = setting.title;
                    return (
                      <Form.Item label={setting.label ? setting.label : setting.key}>
                        {setting.isBlock ? (
                          <Input.TextArea placeholder={setting.description} value={this.state.options[setting.key]}
                            onChange={(e) => { this.updateOption(setting.key, e.target.value); }}
                            rows={5}
                          />
                        ) : (
                          <Input placeholder={setting.description} value={this.state.options[setting.key]}
                            onChange={(e) => {
                              this.updateOption(setting.key, e.target.value);
                            }}
                          />
                        )}
                      </Form.Item>
                    );
                  })}
                  <Button type="primary" onClick={() => this.submit()}>
                    保存设置
                  </Button>
                  {/*<Button type="primary" style={{ 'margin-left': '20px' }} onClick={() => this.backupDatabase()}>
                    {this.state.backupText}
                  </Button>*/}
                  <Button type="primary" style={{ 'margin-left': '20px' }} onClick={() => this.resetCache()}>
                    重置缓存
                  </Button>
                  <Upload {...uploadProps} ShowUploadList={false}><Button style={{ 'margin-left': '20px' }} icon={<UploadOutlined />}>{this.state.uploadText}</Button></Upload>

                </Form>
              </TabPane>
            );
          })}
        </Tabs>
      </div>
    </div>
  );
}
}

const mapStateToProps = (state) => {
  return state;
};

export default connect(mapStateToProps)(Settings);
