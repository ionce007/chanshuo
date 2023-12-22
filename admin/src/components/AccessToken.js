import React, { Component } from 'react';
import axios from 'axios';
import { connect } from 'react-redux';
import { Button, message as Message, Input, Form } from 'antd';
import { dateAdd, dateFormat } from '../utils';

class AccessToken extends Component {
  constructor(props) {
    super(props);
    const loadToken = this.props.match.path === '/accesstoken/get';
    this.state = {
      loading: !loadToken,
      isLoadingData: loadToken,
      token: {
        supplier: this.props.match.params.supplier,
        access_token: '',
        expires_in: 0,
        refresh_token: '',
        scope: '',
        remark: '',
        createdAt: '',
        updatedAt: '',
        expiresDate: '',
      },
    };

    this.formRef = React.createRef();
  }

  static getDerivedStateFromProps({ status }) {
    return { status };
  }

  componentDidMount() {
    if (this.state.status === 0) {
      Message.error('访问被拒绝');
      this.props.history.push('/login');
      return;
    }
    const that = this;
    if (!that.state.isLoadingData) {
      axios.get('/api/accesstoken/get').then(function (res) {
        if (res.data.status) {
            var atoken = res.data.data;
            atoken.createdAt = atoken.createdAt.replace('T',' ').replace('Z','');
            atoken.updatedAt = atoken.updatedAt.replace('T',' ').replace('Z','');
            atoken.expiresDate = dateFormat(dateAdd((new Date(res.data.data.updatedAt)),'s',atoken.expires_in),'yyyy-MM-dd HH:mm:ss.S');
            that.setState({token: atoken, },
              () => { that.formRef.current.resetFields();}
            );
        } else {
            Message.error(res.data.message);
        }
      }).catch(function (err) {
          Message.error(err.message);
      }).finally(() => {
          this.setState({ loading: false });
      });
    }
  }

  bdAuthPage = () => {
    axios.get('/api/bdpan_auth').then(function(res){
      console.log('bdAuthPage',res)
      window.location.href = res.data.url;
      /*var dom = document.getElementsByClassName('content-area');
      if(dom){
        dom[0].innerHTML = `<iframe scrolling="auto" allowtransparency="true" id="layui-layer-iframe2" name="layui-layer-iframe2" onload="this.className='';" class="" frameborder="0" src="${res.data.url}" style="height: 420px;width:90%"></iframe>`
      }
      else Message.info('页面出错！');*/
    }).catch(function(e){
      Message.error(e.message);
    }).finally(()=>{
      this.setState({ loading: false });
    })
    };

  render() {
    return (
      <div className={'content-area'}>
        <h1>授权信息</h1>
        <Form
          labelCol={{ span: 4 }}
          wrapperCol={{ span: 8 }}
          layout="horizontal"
          ref={this.formRef}
          initialValues={this.state.token}
        >
          <Form.Item label="提供商" name="supplier" required>
            <Input />
          </Form.Item>
          <Form.Item label="Token" name="access_token" required>
            <Input />
          </Form.Item>
          <Form.Item label="过期时长" name="expires_in">
            <Input />
          </Form.Item>
          <Form.Item label="更新Token" name="refresh_token">
            <Input />
          </Form.Item>
          <Form.Item label="授权范围" name="scope" >
            <Input />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <Input />
          </Form.Item>
          <Form.Item label="授权时间" name="createdAt">
            <Input />
          </Form.Item>
          <Form.Item label="更新时间" name="updatedAt">
            <Input />
          </Form.Item>
          <Form.Item label="到期时间" name="expiresDate">
            <Input />
          </Form.Item>
          <Form.Item label="操作">
            <Button onClick={this.bdAuthPage}>更新Token</Button>
          </Form.Item>
        </Form>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return state;
};
export default connect(mapStateToProps)(AccessToken);
