import React, { forwardRef } from 'react';
import ReactDOM from 'react-dom';
import { Modal as AntdModal } from 'antd';

const Modal = (props) => {
  const { visible, children, ...rest } = props;
    return (
      <>
        <AntdModal 
          {...rest} 
          open={visible}>
          {
            typeof children === 'object' ? React.Children.map(children, child => React.cloneElement(child)) : children
          }
        </AntdModal>
      </>
  )
}

const forwardRefModal = forwardRef(Modal);
export default forwardRefModal;

forwardRefModal.show = (props) => {
  const { title, content, ...rest } = props;
  let element = document.createElement('div');
  document.body.appendChild(element);
  const onClose = () => {
    ReactDOM.render(getModalNode({ visible: false }), element)
  }
  const afterClose = () => {
    ReactDOM.unmountComponentAtNode(element);
    element.remove();
    element = null;
    if (props.afterClose && typeof props.afterClose === 'function') {
      props.afterClose();
    }
  }
  const onOk = () => {
    if (props.onOk && typeof props.onOk === 'function') {
      const maybePromise = props.onOk();
      if (maybePromise instanceof Promise) {
        maybePromise
        .then(() => { onClose();})
      } else { onClose(); }
      return;
    }
    onClose();
  }
  const getModalNode = ({ visible }) => {
    let modalNode = null;
    modalNode = (
      <Modal
        {...rest}
        visible={visible}
        title={title}
        afterClose={afterClose}
        onOk={onOk}
      >
        {content}
      </Modal>
    )
    return modalNode;
  }
ReactDOM.render(getModalNode({ visible: true }), element)
return {  hide: onClose}
}