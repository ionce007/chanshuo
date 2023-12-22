import React,{useState} from 'react';

const Checkbox = (props) =>{
    const { Checked,label,id } = props;
    const [isChecked, setIsChecked] = useState(Checked);
    
    const onChange=()=>{
        setIsChecked(!isChecked);
    }
    return (
        <div>
            <label><input type='Checkbox' checked={isChecked} onChange={onChange} id={id}/>   {label}</label>
        </div>
    )
}
export default Checkbox;