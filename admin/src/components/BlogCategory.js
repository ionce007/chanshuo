import React, { Component } from 'react';
import { Table, Button, message as Message, Space, Popconfirm, Input, Row, Col, } from 'antd';
import { connect } from 'react-redux';
import axios from 'axios';
//import forwardRefModal from './Modal/Modal'
//import Checkbox from './Modal/Checkbox'
import './Modal/Modal.css'

import { getDate } from '../utils';

const { Search } = Input;

class BlogCategory extends Component {
  constructor(props) {
    super(props);
    this.state = {
      categories: [], category: {}, loading: false, keyword: '', direction: 'up', status: 0, dataCount: 0, 
      pageSize: 10, pageIndex: 1, searchTypingTimeout: 0,
    };
    this.columns = [
      { title: '类别名称', dataIndex: 'title', sorter: (a, b) => a.title > b.title, sortDirections: ['descend', 'ascend'] },
      { title: '上级类别', dataIndex: 'parent', width: '20%' },
      { title: '状态', dataIndex: 'isEnable', width: '10%',
        render: (value, record) => {
          if (value) { return ("可展示"); }
          else { return ("不展示"); }
        },
      },
      { title: '显示顺序', dataIndex: 'iorder', width: '10%', sorter: (a, b) => a.iorder > b.iorder, sortDirections: ['descend', 'ascend'] },
      { title: '显示分类', dataIndex: 'link', width: '15%' },
      {
        title: '操作', width: '12%',
        render: (record) => (
          <Space>
            <Button type="primary" onClick={() => this.editBlogCategory(record.cid)}>编辑</Button>
            <Popconfirm placement="rightTop" title={'确认删除博文？'} onConfirm={() => this.deleteCategory(record.cid)} okText="确认" cancelText="取消">
              <Button type="danger" danger>删除</Button>
            </Popconfirm>
          </Space>
        ),
      },
    ];
    this.formRef = React.createRef();
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
    await this.search();
  }
  searchCategories = (e) => {
    this.setState({ keyword: e.target.value, pageIndex: 1 });
    if (this.state.searchTypingTimeout) { clearTimeout(this.state.searchTypingTimeout); }
    this.setState({ searchTypingTimeout: setTimeout(() => { this.search(); }, 500), });
  };

  async search() {
    const that = this;
    that.setState({ loading: true });
    axios.post(`/api/cate/search`, {
      keyword: this.state.keyword,
      pageSize: this.state.pageSize,
      pageIndex: this.state.pageIndex,
    }).then(async function (res) {
      var { status, message, total, categories } = res.data;
      if (status) {
        categories.forEach(async (cate) => {
          cate.createdAt = getDate(cate.createdAt);
          cate.updatedAt = getDate(cate.updatedAt);
        });
        that.setState({ categories: categories, dataCount: total, loading: false, });
      } else {
        that.setState({ loading: false, });
        Message.error(message);
      }
    }).catch(function (err) {
      that.setState({ loading: false, });
      console.error(err);
    });
  };

  editBlogCategory = (cid) => {
    this.props.history.push(`/cate/${cid}`);
  };
  cateEdit = async () => {
    this.props.history.push('/cate/new');
  }
  refreshRowData = (index, category) => {
    if (index === -1) return;
    // https://stackoverflow.com/a/71530834
    let categories = [...this.state.categories];
    categories[index] = { ...category };
    this.setState({ categories }, () => {
      console.log(this.state.categories[index])
    });
  };
  deleteCategory = (id) => {
    const that = this;
    axios.delete(`/api/cate/${id}`).then(async function (res) {
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
    this.setState({ pageIndex: 1, pageSize: pageSize }, () => {this.search();} );
  }
  render() {
    return (
      <div className={'content-area'}>
        <h1>緾论分类</h1>
        <Row justify="end" align="middle">
          <Col span={2} style={{ marginRight: '18px' }}>
            <Button type="primary" onClick={() => this.cateEdit()} >新建类别</Button>
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
          dataSource={this.state.categories}
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

export default connect(mapStateToProps)(BlogCategory);
