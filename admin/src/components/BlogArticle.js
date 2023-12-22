import React, { Component } from 'react';
import { Table, Button, message as Message, Space, Popconfirm, Input, Select, Row, Col, } from 'antd';
import { connect } from 'react-redux';
import axios from 'axios';
import './Modal/Modal.css'

import { getDate } from '../utils';

const { Search } = Input;

class BlogArticle extends Component {
  constructor(props) {
    super(props);
    this.state = {
      articles: [], article: {}, cateList: [], loading: false, searchTypingTimeout: 0, searchOption: '', keyword: '', activeItem: '',
      direction: 'up', status: 0, visible: false, dataCount: 0, pageSize: 10, pageIndex: 1,
    };
    this.columns = [
      { title: '博文标题', dataIndex: 'title', sorter: (a, b) => a.title > b.title, sortDirections: ['descend', 'ascend'] },
      { title: '分类', width: '18%', render: (record) => (<Space>{ record['CSCategory.title']}</Space>) },
      {
        title: '状态', dataIndex: 'isEnable', width: '7%',
        render: (value, record) => {
          if (value) { return ("可展示"); }
          else { return ("不展示"); }
        },
      },
      {
        title: '发表时间', dataIndex: 'issuedate', width: '15%', sorter: (a, b) => a.issuedate > b.issuedate, sortDirections: ['descend', 'ascend'],
        render: (value, record) => {
          if (!value || value.trim() === '') return '--'
          else return value;
        }
      },
      { title: '显示分类', dataIndex: 'link', width: '8%' },
      { title: '操作', width: '12%',
        render: (record) => (
          <Space>
            <Button type="primary" onClick={() => this.editBlogArticle(record.id)}>编辑</Button>
            <Popconfirm placement="rightTop" title={'确认删除博文？'} onConfirm={() => this.deleteArticle(record.id)} okText="确认" cancelText="取消">
              <Button type="danger" danger>删除</Button>
            </Popconfirm>
          </Space>
        ),
      },
    ];
    this.formRef = React.createRef();
  }

  async componentDidMount() {
    if (this.state.status === 0) {
      Message.error('访问被拒绝');
      this.props.history.push('/login');
      return;
    }
    await this.getCategories();
    await this.search();
  }

  /*static getDerivedStateFromProps(props, curState) {
    debugger;
    curState.status = props.status;
    return { curState };
  }*/

  static getDerivedStateFromProps({ status }) {
    return { status };
  }
  componentWillUnmount() {
    this.setState = ()=>false;
}
  async getCategories() {
    const that = this;
    axios.get(`/api/blog/catelist`).then(async function (res) {
      const { code, msg, data } = res.data;
      if (code === 1) {
        var list = data.map((item, index) => { return { label: item.title, value: item.cid } });
        list.unshift({ label: '全部', value: '' });
        that.setState({ cateList: list });
      }
      else { Message.error(msg); that.setState({ cateList: null }); }
    })
  }
  onSearchOptionChange = (e, { value }) => {
    this.setState({ searchOption: value, pageIndex: 1 }, () => {
      this.search();
    });
  };

  searchCategories = (e) => {
    this.setState({ keyword: e.target.value, pageIndex: 1 });
    if (this.state.searchTypingTimeout) { clearTimeout(this.state.searchTypingTimeout); }
    this.setState({ searchTypingTimeout: setTimeout(() => { this.search(); }, 500), });
  };

  async search() {
    const that = this;
    that.setState({ loading: true });
    axios.post(`/api/blog/search`, {
      keyword: this.state.keyword,
      type : this.state.searchOption,
      pageSize: this.state.pageSize,
      pageIndex: this.state.pageIndex,
    }).then(async function (res) {
      var { status, message, total, articles } = res.data;
      if (status) {
        articles.forEach(async (article) => {
          article.createdAt = getDate(article.createdAt);
          article.updatedAt = getDate(article.updatedAt);
        });
        that.setState({ articles: articles, dataCount: total, loading: false, });
      } else {
        that.setState({ loading: false, });
        Message.error(message);
      }
    }).catch(function (err) {
      that.setState({ loading: false, });
      console.error(err);
    });
  };

  editBlogArticle = (id) => {
    this.props.history.push(`/blog/${id}`);
  };

  refreshRowData = (index, article) => {
    if (index === -1) return;
    // https://stackoverflow.com/a/71530834
    let articles = [...this.state.articles];
    articles[index] = { ...article };
    this.setState({ articles }, () => {
      console.log(this.state.articles[index])
    });
  };
  deleteArticle = (id) => {
    const that = this;
    axios.delete(`/api/blog/${id}`).then(async function (res) {
      const { status, message } = res.data;
      if (status) {
        Message.success('用户删除成功');
        await that.search();
      } else {
        Message.error(message);
      }
    });
  };

  onPageChange(current, pageSize) {
    this.setState({ pageIndex: current, pageSize: pageSize },() => {this.search();});
  }
  onPageSizeChange(current, pageSize) {
    this.setState({ pageIndex: 1, pageSize: pageSize }, () => {this.search();});
  }
  blogEdit = async () => {
    this.props.history.push('/blog/new');
  }

  render() {
    return (
      <div className={'content-area'}>
        <h1>緾论博文</h1>
        <Row justify="end" align="middle">
          <Col span={2} style={{ marginRight: '18px' }}>
            <Button type="primary" onClick={() => this.blogEdit()} >新建博文</Button>
          </Col>
          <Col span={4} style={{ marginRight: '8px' }}>
            <Select
              options={this.state.cateList}
              defaultValue={''}
              value={this.state.searchOption}
              onChange={this.onSearchOptionChange}
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={6}>
            <Search
              placeholder='搜索页面 ...'
              size={'large'}
              value={this.state.keyword}
              onChange={this.searchCategories}
              enterButton
            />
          </Col>
        </Row>

        <Table
          columns={this.columns}
          dataSource={this.state.articles}
          rowKey={'id'}
          style={{ marginTop: '16px' }}
          loading={this.state.loading}
          rowClassName={(record) => record.deleted && 'disabled-row'}
          pagination={
            {
              total: this.state.dataCount,
              pageSize: this.state.pageSize,
              showQuickJumper: true,
              showSizeChanger: true,
              showTotal: total => `共${total}条`,
              pageSizeOptions: [10, 20, 30, 40, 50],
              onShowSizeChange: (current, pageSize) => this.onPageSizeChange(current, pageSize),
              onChange: (current, pageSize) => this.onPageChange(current, pageSize),
              locale: {
                items_per_page: ' 条/页',
                jump_to: '跳到',
                jump_to_confirm: 'string',
                page: '页',
              },
            }
          }
        />
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return state;
};

export default connect(mapStateToProps)(BlogArticle);
