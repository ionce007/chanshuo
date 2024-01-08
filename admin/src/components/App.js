import React from 'react';
import {
  Layout,
  Menu,
  Dropdown,
  Space,
  Button,
  message as Message,
} from 'antd';

import {
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  UserOutlined,
  PoweroffOutlined,
  FileTextOutlined,
  //CommentOutlined,
  CloudUploadOutlined,
  SettingOutlined,
  LogoutOutlined,
  LoginOutlined,
  CodeOutlined,
  VerifiedOutlined,
  FileDoneOutlined,
  StockOutlined,
  UploadOutlined,
} from '@ant-design/icons';

import { Link, Switch, Route } from 'react-router-dom';

import { connect } from 'react-redux';
import { logout, getStatus } from '../actions';

import Editor from './Editor';
import Posts from './Posts';
import Settings from './Settings';
import Users from './Users';
import Files from './Files';
import Comments from './Comments';
import Login from './Login';
import EditUser from './EditUser';
import AccessToken from './AccessToken';
import Formulas from './Formulas';
import BlogArticle from './BlogArticle';
import BlogEditor from './BlogEditor';
import BlogCategory from './BlogCategory';
import BlogCateEdit from './BlogCateEdit';

import './App.css';
import axios from 'axios';

const { Header, Sider, Content } = Layout;

class App extends React.Component {
  state = {
    collapsed: true,
  };

  componentDidMount = () => {
    this.props.getStatus();
  };

  toggle = () => {
    this.setState({
      collapsed: !this.state.collapsed,
    });
  };

  static getDerivedStateFromProps({ status }) {
    return { status };
  }

  logout = async () => {
    let { status, message } = await this.props.logout();
    if (status) {
      Message.success(message);
      this.setState({ status: 0 });
    } else {
      Message.error(message);
    }
  };

  shutdownServer = async () => {
    const res = await axios.get('/api/option/shutdown');
    const { message } = res.data;
    Message.error(message);
  };

  render() {
    const menu = (
      <Menu>
        <Menu.Item key="1" icon={<UserOutlined />}>
          <Link to={'/users'}>账户管理</Link>
        </Menu.Item>
        <Menu.Item key="2" icon={<SettingOutlined />}>
          <Link to={'/settings'}>系统设置</Link>
        </Menu.Item>
        <Menu.Divider />
        {this.state.status === 1 ? (
          <Menu.Item key="3" icon={<LogoutOutlined />}>
            <Link
              to={'/login'}
              onClick={() => {
                this.logout().then((r) => {});
              }}
            >
              退出登录
            </Link>
          </Menu.Item>
        ) : (
          <Menu.Item key="4" icon={<LoginOutlined />}>
            <Link to={'/login'}>用户登录</Link>
          </Menu.Item>
        )}
        <Menu.Item key="5" icon={<PoweroffOutlined />}>
          <Link to={'/login'} onClick={() => this.shutdownServer()}>
            关闭博客
          </Link>
        </Menu.Item>
      </Menu>
    );

    return (
      <Layout style={{ height: '100%' }}>
        <Sider trigger={null} collapsible collapsed={this.state.collapsed}>
          <div className="logo">
            <h1>管理</h1>
          </div>
          <Menu theme="dark" mode="inline" defaultSelectedKeys={['0']}>
            <Menu.Item key="3" icon={<FileTextOutlined />}>
              <Link to={'/posts'}>页面管理</Link>
            </Menu.Item>
            {/* <Menu.Item key="1" icon={<CodeOutlined />}>
              <Link to={'/editor'}>创建页面</Link>
            </Menu.Item> */}
            <Menu.Item key="5" icon={<CloudUploadOutlined />}>
              <Link to={'/files'}>文件管理</Link>
            </Menu.Item>
            <Menu.Item key="8" icon={<VerifiedOutlined />}>
              <Link to={'/accesstoken'}>网盘授权</Link>
            </Menu.Item>
            <Menu.Item key="9" icon={<FileDoneOutlined  />}>
              <Link to={'/formula'}>指标公式</Link>
            </Menu.Item>
            <Menu.Item key="10" icon={<StockOutlined />}>
              <Link to={'/blog'}>缠论文章</Link>
            </Menu.Item>
            <Menu.Item key="11" icon={<CodeOutlined />}>
              <Link to={'/cate'}>缠论分类</Link>
            </Menu.Item>
            <Menu.Item key="6" icon={<UserOutlined />}>
              <Link to={'/users'}>用户管理</Link>
            </Menu.Item>
            <Menu.Item key="12" icon={<SettingOutlined />}>
              <Link to={'/settings'}>系统设置</Link>
            </Menu.Item>
          </Menu>
        </Sider>
        <Layout className="site-layout">
          <Header className="site-layout-background" style={{ padding: 0 }}>
            {React.createElement(
              this.state.collapsed ? MenuUnfoldOutlined : MenuFoldOutlined,
              {
                className: 'trigger',
                onClick: this.toggle,
              }
            )}
            <Space style={{ float: 'right', marginRight: '16px' }}>
              <Dropdown overlay={menu} placement="bottomCenter">
                <Button type={'text'} icon={<UserOutlined />} size={'middle'}>
                  管理员
                </Button>
              </Dropdown>
            </Space>
          </Header>
          <Content>
            <Switch>
              <Route path="/editor" exact component={Editor} />
              <Route path="/editor/:id" exact component={Editor} />
              <Route path="/" exact component={Posts} />
              <Route path="/users" exact component={Users} />
              <Route path="/users/new" exact component={EditUser} />
              <Route path="/users/:id" exact component={EditUser} />
              <Route path="/settings" exact component={Settings} />
              <Route path="/files" exact component={Files} />
              <Route path="/comments" exact component={Comments} />
              <Route path="/posts" exact component={Posts} />
              <Route path="/login" exact component={Login} />
              <Route path="/accesstoken" exact component={AccessToken} />
              <Route path="/formula" exact component={Formulas} />
              <Route path="/blog" exact component={BlogArticle} />
              <Route path="/blog/new" exact component={BlogEditor} />
              <Route path="/blog/:id" exact component={BlogEditor} />
              <Route path="/cate" exact component={BlogCategory} />
              <Route path="/cate/new" exact component={BlogCateEdit} />
              <Route path="/cate/:id" exact component={BlogCateEdit} />
            </Switch>
          </Content>
        </Layout>
      </Layout>
    );
  }
}

const mapStateToProps = (state) => {
  return state;
};

export default connect(mapStateToProps, { logout, getStatus })(App);
