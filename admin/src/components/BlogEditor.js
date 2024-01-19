import 'braft-editor/dist/index.css'
import './App.css';
import React from 'react'
import { connect } from 'react-redux';
import BraftEditor from 'braft-editor'
import { Form, Input, Button, Row, Col, Switch, message as Message, Select, } from 'antd'
import axios from 'axios';

const FormItem = Form.Item;

class BlogEditor extends React.Component {
    constructor(props) {
        super(props);
        const createNew = this.props.match.path === '/blog/new';
        this.state = {
            status: 0, content: '', loading: !createNew, cateList: [], categoryOption: '',
            isCreatingNewArticle: createNew,
            article: {
                id: this.props.match.params.id,
                title: '',
                content: '',
                cid: '',
                issuedate: '',
                isEnable: false,
                href: '',
            },
            editorState: BraftEditor.createEditorState()
        };

        this.formRef = React.createRef();
    }
    async getCategories() {
        const that = this;
        axios.get(`/api/blog/catelist`).then(async function (res) {
            const { code, status, msg, data } = res.data;
            if (code === 1 && status) {
                var list = data.map((item, index) => { return { label: item.title, value: item.cid } });
                list.unshift({ label: '-- 博文类别 --', value: '' });
                that.setState({ cateList: list });
            }
            else { Message.error(msg); that.setState({ cateList: null }); }
        })
    }
    componentDidMount() {
        if (this.state.status === 0) {
            Message.error('访问被拒绝');
            this.props.history.push('/login');
            return;
        }
        this.getCategories();
        this.showArticle(this.state.article.id)
    }
    showArticle = (id) => {
        let article = {};
        const that = this;
        if (!id || id.trim() === '') {
            article = { id: '', title: '', content: '', cid: '', issuedate: '', isEnable: false, href: '', };
            that.setState({ article: that.state.article, }, () => { that.formRef.current.resetFields(); });
        }
        else {
            axios.get(`/api/blog/${id}`).then(function (res) {
                if (res.data.status) {
                    res.data.article.isEnable = res.data.article.isEnable === 1;
                    article = res.data.article;
                    article.content = BraftEditor.createEditorState(article.content)
                    that.setState({ article: res.data.article, }, () => { that.formRef.current.resetFields(); });
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
    static getDerivedStateFromProps({ status }) {
        return { status };
    }
    onBlur = (event) => {

    }
    validator = (_, value, callback) => {
        /*if (!value || value.trim() === '') {
            callback('请输入正文内容')
        } else {
            callback()
        }*/
    }
    prevPage = async() => {
        window.history.go(-1);
    }
    handleSubmit = async (event) => {
        event.preventDefault()
        let article = this.state.article;
        article.content = article.content.toHTML();
        const res = this.state.isCreatingNewArticle ? await axios.post(`/api/blog`, article) : await axios.put(`/api/blog`, article);
        const { status, message } = res.data;
        if (status) {
            Message.success('提交成功');
            this.props.history.goBack();
        } else {
            Message.error(message);
        }
    }
    handleChange = (editorState) => {
        this.setState({ editorState })
    }
    preview = () => {
        if (window.previewWindow) {
            window.previewWindow.close()
        }
        window.previewWindow = window.open()
        window.previewWindow.document.write(this.buildPreviewHtml())
        window.previewWindow.document.close()
    }
    buildPreviewHtml() {
        return `
          <!Doctype html>
          <html>
            <head>
              <title>Preview Content</title>
              <style>
                html,body{
                  height: 100%;
                  margin: 0;
                  padding: 0;
                  overflow: auto;
                  background-color: #f1f2f3;
                }
                .container{
                  box-sizing: border-box;
                  width: 1000px;
                  max-width: 100%;
                  min-height: 100%;
                  margin: 0 auto;
                  padding: 30px 20px;
                  overflow: hidden;
                  background-color: #fff;
                  border-right: solid 1px #eee;
                  border-left: solid 1px #eee;
                }
                .container img,
                .container audio,
                .container video{
                  max-width: 100%;
                  height: auto;
                }
                .container p{
                  white-space: pre-wrap;
                  min-height: 1em;
                }
                .container pre{
                  padding: 15px;
                  background-color: #f1f1f1;
                  border-radius: 5px;
                }
                .container blockquote{
                  margin: 0;
                  padding: 15px;
                  background-color: #f1f1f1;
                  border-left: 3px solid #d1d1d1;
                }
              </style>
            </head>
            <body>
            <div class="container">${this.state.article.content.toHTML()}</div>
            </body>
          </html>
        `
        //<div class="container">${this.state.editorState.toHTML()}</div>
    }
    onCategoryOptionChange = (e, { value }) => {
        this.setState({ categoryOption: value }, () => { });
    };
    onValuesChange = (changedValues, allValues) => {
        let article = { ...this.state.article };
        for (let key in changedValues) {
            if (changedValues.hasOwnProperty(key)) {
                if (key === 'content') { article[key] = BraftEditor.createEditorState(changedValues[key]) }
                else article[key] = changedValues[key];
            }
        }
        this.setState({ article });
    };
    render() {
        const controls = [
            'bold', 'italic', 'underline', 'strike-through', 'text-color', 'separator',
            'font-family', 'font-size', 'separator',
            'headings', 'list-ol', 'list-ul', 'letter-spacing', 'line-height', 'separator',
            'hr', 'blockquote', 'code', 'link', 'emoji', 'media', 'table', 'separator',
            'superscript', 'subscript', 'text-align', 'text-indent', 'remove-styles', 'separator',
            'clear', 'undo', 'redo', 'fullscreen']
        const extendControls = [
            { key: 'preview-button', type: 'button', text: '预览', onClick: this.preview }
        ]
        return (
            <div className={"content-area"}>
                <Form initialValues={this.state.article} ref={this.formRef} onValuesChange={this.onValuesChange}>
                    <Row className='pl-20'>
                        <Col span={11}>
                            <FormItem name='title' label='博文标题' required message='请输入标题' className='mb-5'>
                                <Input size='middle' placeholder="请输入标题" width='100%' />
                            </FormItem>
                        </Col>
                        <Col span={11}>
                            <FormItem name='link' label='显示分类' required>
                                <Input size='middle' placeholder="请输入显示分类" />
                            </FormItem>
                        </Col>
                    </Row>
                    <Row className='pl-20'>
                        <Col span={11}>
                            <FormItem name='cid' label='博文类别' required className='mb-5'>
                                <Select
                                    options={this.state.cateList}
                                    defaultValue={''}
                                    value={this.state.categoryOption}
                                    onChange={this.onCategoryOptionChange}
                                    style={{ width: '100%' }}
                                />
                            </FormItem>
                        </Col>
                        <Col span={11}>
                            <FormItem name='issuedate' label='发表日期' required className='mb-5'>
                                <Input size='middle' placeholder="请输入发表日期" />
                            </FormItem>
                        </Col>
                    </Row>
                    <Row className='pl-20'>
                        <Col span={11}>
                            <FormItem name='isEnable' label='是否展示' required className='mb-5' valuePropName="checked">
                                <Switch checked={this.state.article.isEnable} />
                            </FormItem>
                        </Col>
                        <Col span={11}>
                            <FormItem name='href' label='获取网址' required className='mb-5'>
                                <Input size='middle' placeholder="请输入获取网址" readOnly={!this.state.isCreatingNewArticle} />
                            </FormItem>
                        </Col>
                    </Row>
                    <Row className='pl-20'>
                        <Col span={22}>
                            <FormItem label="文章正文" name='content' required validateTrigger={this.onBlur()} validator={this.validator()}>
                                <BraftEditor className="my-editor" contentStyle={{ height: "400px" }}
                                    controls={controls} extendControls={extendControls} placeholder="请输入正文内容"
                                    onChange={this.handleChange}
                                />
                            </FormItem>
                        </Col>
                    </Row>
                    <Row className='pl-20'>
                        <Col span={16}></Col>
                        <Col span={4}>
                            <FormItem style={{ 'text-align': 'right;' }} >
                                <Button size="middle" type="primary" htmlType="submit" onClick={this.handleSubmit}>提  交</Button>
                            </FormItem>
                        </Col>
                        <Col span={2}><a type='button' href='#' onClick={this.prevPage}>返回列表</a></Col>
                    </Row>
                </Form>
            </div>
        )

    }

}

const mapStateToProps = (state) => {
    return state;
};
export default connect(mapStateToProps)(BlogEditor);