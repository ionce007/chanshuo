import React, { Component } from 'react';
import './App.css';
import axios from 'axios';
import { connect } from 'react-redux';
import { Form, Input, Button, Row, Col, Switch, message as Message, } from 'antd'
const FormItem = Form.Item;

class BlogCateEdit extends Component {
    constructor(props) {
        super(props);
        const createNew = this.props.match.path === '/cate/new';
        this.state = {
            loading: !createNew,
            isCreatingNewCate: createNew,
            cate: {
                cid: this.props.match.params.id,
                title: '',
                parent: '',
                isEnable: false,
                iorder: 0,
                href: '',
                link:'',
            },
        };

        this.formRef = React.createRef();
    }

    componentDidMount() {
        const that = this;
        if (!that.state.isCreatingNewCate) {
            axios.get('/api/cate/' + that.state.cate.cid).then(function (res) {
                if (res.data.status) {
                    res.data.category.isEnable = res.data.category.isEnable === 1;
                    that.setState({ cate: res.data.category, }, () => { that.formRef.current.resetFields(); });
                } else {
                    Message.error(res.data.message);
                }
            }).catch(function (err) {
                Message.error(err.message);
            })
            .finally(() => {
                this.setState({ loading: false });
            });
        }
    }

    onValuesChange = (changedValues, allValues) => {
        let cate = { ...this.state.cate };
        for (let key in changedValues) {
            if (changedValues.hasOwnProperty(key)) {
                cate[key] = changedValues[key];
            }
        }
        this.setState({ cate });
    };

    submitData = async () => {
        const cate = this.state.cate;
        const res = this.state.isCreatingNewCate ? await axios.post(`/api/cate/new`, cate) : await axios.put(`/api/cate`, cate);
        const { status, message } = res.data;
        debugger;
        if (status) {
            Message.success('提交成功');
            this.props.history.goBack();
        } else {
            Message.error(message);
        }
    };
    prevPage = async() => {
        window.history.go(-1);
    }
    render() {
        return (
            <div className={'content-area'}>
                <h1 className='mb-20'>编辑博文分类</h1>
                <Form className='mlr-25' onValuesChange={this.onValuesChange} ref={this.formRef} initialValues={this.state.cate}>
                    <Row>
                        <Col span={11}>
                            <FormItem name='title' label='类别名称' required message='请输入类别名称' >
                                <Input size='middle' placeholder="请输入类别名称" width='100%' />
                            </FormItem>
                        </Col>
                        <Col span={11}>
                            <FormItem name='parent' label='父类名称' required >
                                <Input size='middle' placeholder="请输入父类名称" />
                            </FormItem>
                        </Col>
                    </Row>
                    <Row>
                        <Col span={11}>
                            <FormItem name='isEnable' label='是否展示' required valuePropName="checked">
                                <Switch checked={this.state.cate.isEnable} />
                            </FormItem>
                        </Col>
                        <Col span={11}>
                            <FormItem name='iorder' label='显示顺序' required >
                                <Input size='middle' placeholder="请输入显示顺序" />
                            </FormItem>
                        </Col>
                    </Row>
                    <Row>
                        <Col span={11}>
                            <FormItem name='href' label='获取网址' required>
                                <Input size='middle' placeholder="请输入获取网址" readOnly={!this.state.isCreatingNewCate} />
                            </FormItem>
                        </Col>
                        <Col span={11}>
                            <FormItem name='link' label='显示分类' required>
                                <Input size='middle' placeholder="请输入显示分类"  />
                            </FormItem>
                        </Col>
                    </Row>
                    <Row className='pl-20'>
                        <Col span={16}></Col>
                        <Col span={4}>
                            <FormItem style={{ 'text-align': 'right;' }} >
                                <Button size="middle" type="primary" htmlType="submit" onClick={this.submitData}>提  交</Button>
                            </FormItem>
                        </Col>
                        <Col span={2}><a type='button' href='#' onClick={this.prevPage}>返回列表</a></Col>
                        
                    </Row>
                </Form>
            </div>
        );
    }
}

const mapStateToProps = (state) => {
    return state;
};
export default connect(mapStateToProps)(BlogCateEdit);
