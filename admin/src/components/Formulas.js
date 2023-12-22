import React, { Component } from 'react';
import { Table, Button, message as Message, Tooltip, Space, Popconfirm, Input, Select, Row, Col, Form } from 'antd';
import { connect } from 'react-redux';
import axios from 'axios';
import forwardRefModal from './Modal/Modal'
import Checkbox from './Modal/Checkbox'
import './Modal/Modal.css'

import { getDate, formatBytes } from '../utils';

const { Search } = Input;
const FORMULA_KIND = [
  { key: 'grey', label: '全部', value: -1 },
  { key: 'volcano', label: '指标公式', value: 0 },
  { key: 'geekblue', label: '选股公式', value: 1 },
  { key: 'orange', label: '操作说明', value: 2 },
  { key: 'olive', label: '经验分享', value: 3 }
];
class Formula extends Component {
  constructor(props) {
    super(props);
    this.state = {
      formulas: [], formula: {}, loading: false, searchTypingTimeout: 0, searchOption: -1, keyword: '', activeItem: '',
      direction: 'up', status: 0, visible: false, dataCount: 0, pageSize: 10, pageIndex: 1,
    };
    this.submitData = this.submitData.bind(this);
    this.columns = [
      { title: '文件ID', dataIndex: 'fs_id', width: '5%' },
      {
        title: '文件名称', dataIndex: 'server_filename', sorter: (a, b) => a.server_filename > b.server_filename, sortDirections: ['descend', 'ascend'],
        render: (value, record) => (
          <>
            <Tooltip title={`发布于：${record.createtime}\n编辑于：${record.lastupdate}`}>
              <span><a target='_blank' rel="noreferrer" href={'/formula/' + record.fs_id}>{value ? value : '无文件名称'}</a></span>
            </Tooltip>
          </>
        ),
      },
      { title: '类型', dataIndex: 'kind', width: '8%' },
      {
        title: '售价', dataIndex: 'price', sorter: (a, b) => a.price > b.price, sortDirections: ['descend', 'ascend'], width: '5%',
        render: (value) => (value === 0 ? '--' : `￥${value.toFixed(2)}`),
      },
      {
        title: '状态', dataIndex: 'isSell', width: '7%',
        render: (value, record) => {
          if (value === 1) { return ("在售"); }
          else { return ("已下架"); }
        },
      },
      { title: '文件大小', dataIndex: 'size', width: '10%', sorter: (a, b) => a.size > b.size, sortDirections: ['descend', 'ascend'], render: (value) => { return formatBytes(value, 2); } },
      { title: '修改时间', dataIndex: 'lastupdate', width: '15%', sorter: (a, b) => a.size > b.size, sortDirections: ['descend', 'ascend'], },
      {
        title: '操作', width: '12%',
        render: (record) => (
          <Space>
            <Button type="primary" onClick={() => this.editPage(record)}>编辑</Button>
            <Popconfirm placement="rightTop" title={'确认删除页面？'} onConfirm={() => this.deleteFormula(record.fs_id)} okText="确认" cancelText="取消">
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

  onSearchOptionChange = (e, { value }) => {
    this.setState({ searchOption: value, pageIndex: 1 }, () => {
      this.search();
    });
  };

  searchPages = (e) => {
    this.setState({ keyword: e.target.value, pageIndex: 1 });
    if (this.state.searchTypingTimeout) { clearTimeout(this.state.searchTypingTimeout); }
    this.setState({ searchTypingTimeout: setTimeout(() => { this.search(); }, 500), });
  };

  async search() {
    const that = this;
    that.setState({ loading: true });
    axios.post(`/api/formula/search`, {
      type: FORMULA_KIND[this.state.searchOption + 1].label,
      keyword: this.state.keyword,
      pageSize: this.state.pageSize,
      pageIndex: this.state.pageIndex,
    }).then(async function (res) {
      const { status, message, total, formulas } = res.data;
      if (status) {
        formulas.forEach((formula) => {
          formula.server_filename = formula.server_filename.substr(0, formula.server_filename.lastIndexOf('.'));
          formula.createtime = getDate(formula.createtime);
          formula.lastupdate = getDate(formula.lastupdate);
        });
        that.setState({ formulas: formulas, dataCount: total, loading: false, });
      } else {
        that.setState({ loading: false, });
        Message.error(message);
      }
    }).catch(function (err) {
      that.setState({ loading: false, });
      console.error(err);
    });
  };

  submitData = async (record) => {
    var formula = record;
    formula.price = price.value;
    formula.isSell = isSell.checked ? 1 : 0;
    await axios.put(`/api/formula`, formula).then(async function (res) {
      if (res.status === 200) Message.success('数据修改成功！')
      else { Message.error(res.data.msg); }
    })
  }

  editPage = async (record) => {
    debugger;
    this.submitData.bind(this, record);
    //this.state.formula = record;
    const { hide } = forwardRefModal.show({
      title: '编辑',
      content: (
        <Form labelCol={{ span: 4 }} wrapperCol={{ span: 8 }} layout="horizontal" ref={this.formRef} initialValues={record}>
          <Form.Item label="文件名称" name="server_filename" required wrapperCol={{ span: 18 }} >
            <Input readOnly />
          </Form.Item>
          <Form.Item label="售价(元)" name="price" required type='money' wrapperCol={{ span: 4 }}>
            <Input />
          </Form.Item>
          <Form.Item label="" name="isSell" required >
            <Checkbox Checked={record.isSell} label={'是否上架'} style={{ margin: '0 10px;' }} id={'isSell'} />
          </Form.Item>
          <Form.Item label="文件ID" name="fs_id" required className='hidden'>
            <Input type="hidden" />
          </Form.Item>
        </Form>
      ),
      cancelText: '取消',
      okText: '确认',
      onOk: () => {
        this.submitData(record);
        let index = -1;
        let that = this
        let formulas = that.state.formulas;
        formulas.find(function (item, i) {
          if (item.fs_id === record.fs_id) { index = i; return i; }
        });
        let formula = record;
        formula.price = Number(price.value);
        formula.isSell = isSell.checked ? 1 : 0;
        this.refreshRowData(index, formula)
      },
      onCancel: () => { hide(); },
    })
  };

  refreshRowData = (index, formula) => {
    if (index === -1) return;
    // https://stackoverflow.com/a/71530834
    let formulas = [...this.state.formulas];
    formulas[index] = { ...formula };
    this.setState({ formulas }, () => {
      console.log(this.state.formulas[index])
    });
  };
  deleteFormula = (fs_id) => {
    const that = this;
    axios.delete(`/api/formula/${fs_id}`).then(async function (res) {
      const { status, msg } = res.data;
      if (status) {
        Message.info('删除成功！');
        that.search();
      } else {
        Message.error(msg);
      }
    });
  };

  onPageChange(current, pageSize) {
    this.setState({ pageIndex: current, pageSize: pageSize }, () => { this.search(); });
  }
  onPageSizeChange(current, pageSize) {
    this.setState({ pageIndex: 1, pageSize: pageSize },() => { this.search();});
  }
  asyncPan = async () => {
    const that = this;
    that.setState({ loading: true });
    var cookie = txtPanCookie.value;
    axios.post('/api/formula/async', { cookie: cookie }).then(async function (res) {
      if (!res.data.status) { Message.error(res.data.msg); return; }
      else{ that.search(); Message.success(res.data.msg);}
      that.setState({ loading: false, });
    }).catch(function (err) {
      that.setState({ loading: false, });
      Message.error(err);
    });
  }
  render() {
    return (
      <div className={'content-area'}>
        <h1>指标公式管理</h1>
        <Row justify="end" align="middle">
          <Col span={10} style={{ marginRight: '8px' }}>
            <Input type='textbox' id='txtPanCookie'
              placeholder='输入网盘cookie ...'
              size={'large'}
            />
          </Col>
          <Col span={2} style={{ marginRight: '8px' }}>
            <Popconfirm placement="leftTop" title={'同步网盘数据前，请先登录“https://pan.baidu.com/disk/main”！'} onConfirm={() => this.asyncPan()} okText="确认" cancelText="取消">
              <Button type="primary" >同步网盘</Button>
            </Popconfirm>
          </Col>
          <Col span={2} style={{ marginRight: '18px' }}>
            <Select
              options={FORMULA_KIND}
              defaultValue={-1}
              value={this.state.searchOption}
              onChange={this.onSearchOptionChange}
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={8}>
            <Search
              placeholder='搜索页面 ...'
              size={'large'}
              value={this.state.keyword}
              onChange={this.searchPages}
              enterButton
            />
          </Col>
        </Row>

        <Table
          columns={this.columns}
          dataSource={this.state.formulas}
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

export default connect(mapStateToProps)(Formula);
